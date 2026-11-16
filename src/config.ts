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
