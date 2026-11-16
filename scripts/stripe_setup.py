#!/usr/bin/env python3
"""Create the PS Daily subscription products + monthly prices (DKK with USD option) in Stripe.

Idempotent per Stripe account. Prices are found by lookup key (ps_<tier>_monthly), so the app
works the same in test and live mode. Needs the Stripe secret key sent as a Bearer header
(here it is injected by the network proxy); for local use add: -H "Authorization: Bearer $STRIPE_SECRET_KEY".
"""
import json, subprocess
API = 'https://api.stripe.com/v1/'

def post(path, data, idem):
    args = ['curl', '-sS', '--max-time', '30', API + path, '-H', f'Idempotency-Key: {idem}']
    for k, v in data.items():
        args += ['-d', f'{k}={v}']
    r = json.loads(subprocess.run(args, capture_output=True, text=True).stdout)
    if 'error' in r:
        raise SystemExit(r['error']['message'])
    return r

PLANS = [
    ('accountable', 'PS Daily — Accountable', 'Daily check-in & planner, challenge questions, identity work, coach chat, weekly review & goals.', 34900, 5000),
    ('perform', 'PS Daily — Perform', 'Everything in Accountable + personal training programs and TrainingPeaks connection.', 199900, 30000),
    ('elite', 'PS Daily — Elite', 'Everything in Perform + mental worksheets and events.', 349900, 50000),
]
out = {}
for tier, name, desc, dkk, usd in PLANS:
    prod = post('products', {'name': name, 'description': desc, 'metadata[tier]': tier}, f'psdaily-prod-{tier}-v1')
    price = post('prices', {
        'product': prod['id'],
        'currency': 'dkk',
        'unit_amount': dkk,
        'currency_options[usd][unit_amount]': usd,
        'recurring[interval]': 'month',
        'lookup_key': f'ps_{tier}_monthly',
        'transfer_lookup_key': 'true',
        'metadata[tier]': tier,
    }, f'psdaily-price-{tier}-v1')
    out[tier] = {'product': prod['id'], 'price': price['id'], 'livemode': price['livemode']}
print(json.dumps(out, indent=2))
