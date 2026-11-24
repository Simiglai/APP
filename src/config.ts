/** Business settings — edit these, no code changes needed elsewhere. */
export const COACH_NAME = 'Patrick Simiglai';

/** Link to the booking page for Private Personal Advisory calls (e.g. Calendly). Empty = clients send a request via the in-app coach chat. */
export const BOOKING_URL = 'https://calendly.com/patricksimiglai/30-min-gratis-afklaringssamtale';

export type Currency = 'USD' | 'DKK';

/** Default currency: Danish-language devices see DKK, everyone else USD. Clients can switch on the membership page. */
export const defaultCurrency = (): Currency =>
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('da') ? 'DKK' : 'USD';

export const formatPrice = (amount: number, currency: Currency) =>
  currency === 'DKK' ? `${amount.toLocaleString('da-DK')} kr.` : `$${amount.toLocaleString('en-US')}`;

/**
 * Supabase project "PS Daily" (EU — Frankfurt). The publishable key is designed to be public:
 * it ships inside the app and all data access is protected by row-level security.
 */
export const SUPABASE_URL = 'https://olpjikegieacdcqzenvn.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_kQh6ZfmaGeEVd5vt87EtVA_TYdhPlso';

/** Business details shown in the privacy policy and terms of sale. */
/** Seller + data controller: Simiglai LLC (Wyoming), owner Patrick Simiglai. Payments via its US Stripe account. */
export const COMPANY = {
  name: 'Simiglai LLC',
  registration: 'Wyoming LLC · Filing ID 2026-002005371',
  address: '1309 Coffeen Ave, Suite 1200, Sheridan, Wyoming 82801',
  country: 'USA',
  email: 'ps@patricksimiglai.com',
  web: 'https://app.patricksimiglai.com',
  /** GDPR art. 27 representative in the EU (designated in writing — see docs/eu-representative.md). TODO: add Danish address. */
  euRepresentative: 'Patrick Simiglai, Danmark · ps@patricksimiglai.com',
};

/** Bump when the terms or privacy policy change materially; stored with each client's consent. */
export const LEGAL_VERSION = '2026-11-22b';
