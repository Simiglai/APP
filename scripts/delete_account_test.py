import json, subprocess, time, sys
sys.path.insert(0, '/tmp/claude-0/-home-user-APP/61b55a88-2269-5762-84d0-76a34892bc1f/scratchpad')
REF='olpjikegieacdcqzenvn'; BASE=f'https://{REF}.supabase.co'
PK=[l for l in open('/home/user/APP/src/config.ts') if 'SUPABASE_PUBLISHABLE_KEY =' in l][0].split("'")[1]
def curl(*a, data=None):
    cmd=['curl','-sS','--max-time','60',*a]
    if data is not None: cmd+=['--data-binary','@-']
    o=subprocess.run(cmd,input=data,capture_output=True,text=True).stdout
    return json.loads(o) if o.strip().startswith(('{','[')) else o
sql=lambda q: curl('-X','POST',f'https://api.supabase.com/v1/projects/{REF}/database/query','-H','Content-Type: application/json',data=json.dumps({'query':q}))
def stripe(path, params=None, method=None):
    a=[f'https://api.stripe.com/v1/{path}']+(['-X',method] if method else [])
    for k,v in (params or {}).items(): a+=['-d',f'{k}={v}']
    return curl(*a)
fn=lambda name,tok,body: curl('-X','POST',f'{BASE}/functions/v1/{name}','-H',f'Authorization: Bearer {tok}','-H',f'apikey: {PK}','-H','Content-Type: application/json',data=json.dumps(body))
email=f'ps-del-{int(time.time())}@psdaily-test.dk'; customer=None
try:
    r=curl('-X','POST',f'{BASE}/auth/v1/signup','-H',f'apikey: {PK}','-H','Content-Type: application/json',data=json.dumps({'email':email,'password':'Test-password-123','data':{'name':'Del Test','language':'da'}}))
    tok,uid=r['access_token'],r['user']['id']
    fn('create-checkout',tok,{'tier':'accountable','currency':'dkk','waiver':True})
    customer=sql(f"select stripe_customer_id from profiles where id='{uid}'")[0]['stripe_customer_id']
    pm=stripe('payment_methods/pm_card_visa/attach',{'customer':customer})['id']
    stripe(f'customers/{customer}',{'invoice_settings[default_payment_method]':pm})
    price=stripe('prices?lookup_keys[]=ps_accountable_monthly')['data'][0]['id']
    sub=stripe('subscriptions',{'customer':customer,'items[0][price]':price,'currency':'dkk','metadata[user_id]':uid})
    for _ in range(20):
        if sql(f"select plan_status from profiles where id='{uid}'")[0]['plan_status']=='active': break
        time.sleep(1.5)
    sql(f"insert into days (user_id,date,data) values ('{uid}', current_date, '{{\"mood\":4}}'); insert into messages (client_id,sender_id,body) values ('{uid}','{uid}','hej')")
    print('before:', sql(f"select (select plan_status from profiles where id='{uid}') st, (select count(*) from days where user_id='{uid}') days, (select count(*) from messages where client_id='{uid}') msgs")[0], '| stripe sub:', sub['status'])
    print('delete →', fn('delete-account',tok,{}))
    print('after: user rows =', sql(f"select (select count(*) from auth.users where id='{uid}') u, (select count(*) from profiles where id='{uid}') p, (select count(*) from days where user_id='{uid}') d, (select count(*) from messages where client_id='{uid}') m")[0])
    print('stripe subscription now:', stripe(f"subscriptions/{sub['id']}")['status'])
    coach_tok=None
finally:
    if customer: stripe(f'customers/{customer}',method='DELETE')
    sql(f"delete from auth.users where email='{email}'")
    print('cleanup done')
