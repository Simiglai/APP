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
/** Seller + data controller: the Danish business behind the live Stripe account (individual, patricksimiglai.com). */
export const COMPANY = {
  name: 'Patrick Simiglai (patricksimiglai.com)',
  registration: '', // TODO Patrick: 'CVR: 12345678' once registered
  address: '', // TODO Patrick: business address in Denmark (required to be shown by Danish e-commerce rules)
  country: 'Danmark / Denmark',
  email: 'ps@patricksimiglai.com',
  web: 'https://app.patricksimiglai.com',
  /** Only needed for a seller outside the EU (GDPR art. 27). */
  euRepresentative: '',
};

/** Bump when the terms or privacy policy change materially; stored with each client's consent. */
export const LEGAL_VERSION = '2026-11-22';
