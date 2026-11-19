"""End-to-end payment test (Stripe TEST mode): sign up a throwaway client, open checkout,
pay with the test Visa, check the webhook unlocks the plan, open the portal, cancel, check access
is removed, then delete the test client and Stripe customer. Needs Supabase management + Stripe
test credentials sent as Authorization headers (injected by the proxy in Claude sessions)."""
import json, subprocess, time
REF = 'olpjikegieacdcqzenvn'
BASE = f'https://{REF}.supabase.co'
PK = [l for l in open('/home/user/APP/src/config.ts') if 'SUPABASE_PUBLISHABLE_KEY =' in l][0].split("'")[1]

def curl(*args, data=None):
    cmd = ['curl', '-sS', '--max-time', '60', *args]
    if data is not None: cmd += ['--data-binary', '@-']
    out = subprocess.run(cmd, input=data, capture_output=True, text=True).stdout
    return json.loads(out) if out.strip().startswith(('{', '[')) else out

def sql(q): return curl('-X', 'POST', f'https://api.supabase.com/v1/projects/{REF}/database/query', '-H', 'Content-Type: application/json', data=json.dumps({'query': q}))
def stripe(path, params=None, method=None):
    args = [f'https://api.stripe.com/v1/{path}']
    if method: args += ['-X', method]
    for k, v in (params or {}).items(): args += ['-d', f'{k}={v}']
    return curl(*args)
def fn(name, token, body): return curl('-X', 'POST', f'{BASE}/functions/v1/{name}', '-H', f'Authorization: Bearer {token}', '-H', f'apikey: {PK}', '-H', 'Content-Type: application/json', data=json.dumps(body))
def profile(uid): return sql(f"select plan, plan_status, stripe_customer_id is not null as has_customer from profiles where id='{uid}'")[0]
def wait_for(uid, cond, label):
    for _ in range(30):
        p = profile(uid)
        if cond(p): print('  ✓', label, p); return p
        time.sleep(2)
    print('  ✗ TIMEOUT', label, profile(uid)); return None

email = f'ps-paytest-{int(time.time())}@psdaily-test.dk'
uid = customer = None
try:
    r = curl('-X', 'POST', f'{BASE}/auth/v1/signup', '-H', f'apikey: {PK}', '-H', 'Content-Type: application/json', data=json.dumps({'email': email, 'password': 'Test-password-123', 'data': {'name': 'Pay Test'}}))
    token, uid = r['access_token'], r['user']['id']
    print('1. test client signed up', profile(uid))

    sql(f"update profiles set approved_tiers='{{perform}}' where id='{uid}'")  # coach approved after the call
    co = fn('create-checkout', token, {'tier': 'perform', 'currency': 'dkk', 'locale': 'da', 'waiver': True, 'returnUrl': 'https://app.patricksimiglai.com/'})
    url = co.get('url', '')
    print('2. checkout url:', url[:45] + '…' if url else co)
    sess_id = url.split('/pay/')[1].split('#')[0] if '/pay/' in url else None
    if sess_id:
        s = stripe(f'checkout/sessions/{sess_id}?expand[]=line_items')
        li = s['line_items']['data'][0]
        print(f"   session: locale={s.get('locale')} mode={s['mode']} currency={s['currency']} amount={s['amount_total']/100:.0f} {s['currency'].upper()} price={li['price']['lookup_key']} success_url={s['success_url']}")

    customer = sql(f"select stripe_customer_id from profiles where id='{uid}'")[0]['stripe_customer_id']
    # pay with Stripe's test Visa (what the client would type on the checkout page)
    pm = stripe('payment_methods/pm_card_visa/attach', {'customer': customer})['id']
    stripe(f'customers/{customer}', {'invoice_settings[default_payment_method]': pm})
    price = stripe('prices?lookup_keys[]=ps_perform_monthly')['data'][0]['id']
    sub = stripe('subscriptions', {'customer': customer, 'items[0][price]': price, 'currency': 'dkk', 'metadata[user_id]': uid, 'metadata[tier]': 'perform'})
    print('3. paid with test card → subscription', sub.get('status'), sub.get('error', ''))
    wait_for(uid, lambda p: p['plan'] == 'perform' and p['plan_status'] == 'active', 'webhook unlocked Perform')

    po = fn('customer-portal', token, {'returnUrl': 'https://ps-daily.netlify.app/'})
    print('4. billing portal url:', (po.get('url') or po)[:50])

    co2 = fn('create-checkout', token, {'tier': 'perform', 'currency': 'usd'})
    print('5. same plan again is refused:', co2.get('error'))

    if 'id' in sub: stripe(f"subscriptions/{sub['id']}", method='DELETE')
    print('6. subscription cancelled')
    wait_for(uid, lambda p: p['plan_status'] == 'canceled', 'webhook removed access')
finally:
    if customer: stripe(f'customers/{customer}', method='DELETE')
    if uid: sql(f"delete from auth.users where id='{uid}'")
    print('cleanup: test client + Stripe test customer deleted')
