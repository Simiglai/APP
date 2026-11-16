/**
 * Events for Elite members. Add real events here, newest last — e.g.
 * { id: 'camp-2027', title: 'Training camp', date: '2027-03-14', time: '09:00', location: 'Copenhagen', description: '…', signupUrl: 'https://…' }
 * Once accounts & sync are live these move to the database so Patrick can publish them from the coach dashboard.
 */
export type CoachEvent = { id: string; title: string; date: string; time?: string; location: string; description: string; signupUrl?: string };

export const EVENTS: CoachEvent[] = [];
