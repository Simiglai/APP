/**
 * Privacy policy (privatlivspolitik) and terms of sale (handelsbetingelser).
 * Served at /privatliv and /handelsbetingelser (also reachable without logging in).
 * DRAFT — to be reviewed by Patrick (ideally with a lawyer/accountant) before launch.
 */
import type { ReactNode } from 'react';
import { COACH_NAME, COMPANY, LEGAL_VERSION } from '../config';
import { PLANS, priceLabel } from '../lib/plans';
import { getLang } from '../i18n';
import { BrandLogo } from '../ui';

export const PRIVACY_PATH = '/privatliv';
export const TERMS_PATH = '/handelsbetingelser';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="legal__section">
    <h2>{title}</h2>
    {children}
  </section>
);

const Company = () => (
  <p>
    {COMPANY.name}
    <br />
    {COMPANY.registration && (
      <>
        {COMPANY.registration}
        <br />
      </>
    )}
    {COMPANY.address && (
      <>
        {COMPANY.address}
        <br />
      </>
    )}
    {COMPANY.country}
    <br />
    <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
    {COMPANY.euRepresentative && (
      <>
        <br />
        {getLang() === 'da' ? 'Repræsentant i EU (GDPR art. 27)' : 'Representative in the EU (GDPR art. 27)'}: {COMPANY.euRepresentative}
      </>
    )}
  </p>
);

const prices = () =>
  PLANS.map((p) => `${p.name}: ${priceLabel(p, 'DKK')}${p.price.USD !== null ? ` (${priceLabel(p, 'USD')})` : ''}`).join(' · ');

function PrivacyDA() {
  return (
    <>
      <h1>Privatlivspolitik</h1>
      <p className="muted">Gældende fra {LEGAL_VERSION}</p>
      <Section title="1. Dataansvarlig">
        <Company />
      </Section>
      <Section title="2. Hvilke oplysninger behandler vi?">
        <ul>
          <li><b>Konto:</b> navn, e-mail, adgangskode (krypteret), sprog og valuta.</li>
          <li><b>Din profil:</b> din identitet, hvem du er ved at blive, formål, værdier og mål.</li>
          <li><b>Daglige check-ins:</b> humør, energi, søvn, træning, mad, vand, sociale relationer og brug af sociale medier, svar på spørgsmål, refleksioner og ugentlige evalueringer.</li>
          <li><b>Mentale øvelser</b> og <b>beskeder</b> mellem dig og din coach.</li>
          <li><b>Betaling:</b> abonnement og betalingsstatus. Kortoplysninger håndteres udelukkende af Stripe — vi ser dem aldrig.</li>
        </ul>
        <p>Oplysninger om humør, energi, søvn, træning og kost kan være <b>helbredsoplysninger</b>. Dem behandler vi kun med dit udtrykkelige samtykke, som du giver, når du opretter din konto.</p>
      </Section>
      <Section title="3. Formål og retsgrundlag">
        <ul>
          <li>At levere appen og coachingen, du har købt — GDPR art. 6, stk. 1, litra b (aftale).</li>
          <li>At din coach kan følge dine check-ins og fremskridt — GDPR art. 9, stk. 2, litra a (udtrykkeligt samtykke).</li>
          <li>Bogføring af betalinger — GDPR art. 6, stk. 1, litra c (retlig forpligtelse).</li>
        </ul>
        <p>Vi bruger ikke dine data til markedsføring, sælger dem ikke og bruger ingen sporings- eller reklamecookies.</p>
      </Section>
      <Section title="4. Hvem har adgang?">
        <p>Kun du og din coach, {COACH_NAME}. Vi bruger disse databehandlere til at drive tjenesten:</p>
        <ul>
          <li><b>Supabase</b> — database og login. Data opbevares i EU (Frankfurt).</li>
          <li><b>Netlify</b> — hosting af selve appen.</li>
          <li><b>Stripe</b> — betaling og abonnementer.</li>
          <li><b>Resend</b> — afsendelse af e-mails (bekræftelse, nulstilling af adgangskode).</li>
          <li><b>Calendly</b> — når du booker en samtale.</li>
          <li><b>YouTube / Vimeo</b> — når du afspiller en træningsvideo.</li>
        </ul>
        <p>Nogle af disse leverandører kan overføre data til USA. Det sker på grundlag af EU-Kommissionens standardkontraktbestemmelser og/eller EU-US Data Privacy Framework.</p>
      </Section>
      <Section title="5. Hvor længe gemmer vi dine data?">
        <p>Så længe du har en konto. Sletter du din konto, slettes alle dine data med det samme. Regnskabsbilag (fakturaer) opbevares så længe, regnskabsreglerne kræver det (typisk 5–7 år).</p>
      </Section>
      <Section title="6. Dine rettigheder">
        <ul>
          <li>Indsigt i, rettelse af og sletning af dine data — du kan selv slette din konto under <b>Mig → Slet min konto</b>.</li>
          <li>Dataportabilitet, begrænsning af og indsigelse mod behandling.</li>
          <li>Du kan til enhver tid trække dit samtykke tilbage ved at skrive til os. Det påvirker ikke behandling, der er sket før.</li>
          <li>Du kan klage til <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener">Datatilsynet</a>.</li>
        </ul>
      </Section>
      <Section title="7. Lokal lagring">
        <p>Appen gemmer din login-session og en lokal kopi af dine data på din enhed, så den virker uden internet. Det er nødvendigt for tjenesten og bruges ikke til sporing.</p>
      </Section>
      <Section title="8. Kontakt">
        <p>Spørgsmål om dine data: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
      </Section>
    </>
  );
}

function PrivacyEN() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p className="muted">Effective from {LEGAL_VERSION}</p>
      <Section title="1. Data controller">
        <Company />
      </Section>
      <Section title="2. What we process">
        <ul>
          <li><b>Account:</b> name, email, password (encrypted), language and currency.</li>
          <li><b>Your profile:</b> identity, who you are becoming, purpose, values and goals.</li>
          <li><b>Daily check-ins:</b> mood, energy, sleep, training, food, water, socials and social-media use, answers, reflections and weekly reviews.</li>
          <li><b>Mental worksheets</b> and <b>messages</b> between you and your coach.</li>
          <li><b>Payment:</b> subscription and payment status. Card details are handled only by Stripe — we never see them.</li>
        </ul>
        <p>Mood, energy, sleep, training and diet can be <b>health data</b>. We only process it with your explicit consent, given when you create your account.</p>
      </Section>
      <Section title="3. Purposes and legal basis">
        <ul>
          <li>Providing the app and coaching you bought — GDPR Art. 6(1)(b) (contract).</li>
          <li>Letting your coach follow your check-ins and progress — GDPR Art. 9(2)(a) (explicit consent).</li>
          <li>Bookkeeping of payments — GDPR Art. 6(1)(c) (legal obligation).</li>
        </ul>
        <p>We do not use your data for marketing, never sell it, and use no tracking or advertising cookies.</p>
      </Section>
      <Section title="4. Who has access?">
        <p>Only you and your coach, {COACH_NAME}. We use these processors to run the service:</p>
        <ul>
          <li><b>Supabase</b> — database and login. Data is stored in the EU (Frankfurt).</li>
          <li><b>Netlify</b> — hosting of the app.</li>
          <li><b>Stripe</b> — payments and subscriptions.</li>
          <li><b>Resend</b> — sending emails (confirmation, password reset).</li>
          <li><b>Calendly</b> — when you book a call.</li>
          <li><b>YouTube / Vimeo</b> — when you play a workout video.</li>
        </ul>
        <p>Some of these providers may transfer data to the USA, based on the EU Standard Contractual Clauses and/or the EU-US Data Privacy Framework.</p>
      </Section>
      <Section title="5. How long we keep your data">
        <p>As long as you have an account. If you delete your account, all your data is deleted immediately. Accounting records (invoices) are kept as long as accounting rules require (typically 5–7 years).</p>
      </Section>
      <Section title="6. Your rights">
        <ul>
          <li>Access, correction and deletion — you can delete your account yourself under <b>Me → Delete my account</b>.</li>
          <li>Data portability, restriction of and objection to processing.</li>
          <li>You can withdraw your consent at any time by writing to us. This does not affect processing that happened before.</li>
          <li>You can complain to the Danish Data Protection Agency (<a href="https://www.datatilsynet.dk" target="_blank" rel="noopener">Datatilsynet</a>).</li>
        </ul>
      </Section>
      <Section title="7. Local storage">
        <p>The app stores your login session and a local copy of your data on your device so it works offline. This is necessary for the service and not used for tracking.</p>
      </Section>
      <Section title="8. Contact">
        <p>Questions about your data: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
      </Section>
    </>
  );
}

function TermsDA() {
  return (
    <>
      <h1>Handelsbetingelser</h1>
      <p className="muted">Gældende fra {LEGAL_VERSION}</p>
      <Section title="1. Sælger">
        <Company />
      </Section>
      <Section title="2. Ydelsen">
        <p>Et månedligt abonnement på coaching-appen {COACH_NAME} med dagligt check-in, accountability med din coach og indhold efter det valgte medlemskab. Medlemskaberne og deres indhold er beskrevet i appen under Medlemskab.</p>
        <p><b>Perform</b>, <b>Elite</b> og <b>Private</b> kræver en forudgående gratis samtale og godkendelse fra din coach.</p>
        <p><b>Private</b> er et 12-måneders forløb, der betales forud. Det fornyes ikke automatisk, og I aftaler sammen, om I fortsætter. Det indbetalte beløb refunderes ikke ved ophør før tid, medmindre andet følger af ufravigelig lovgivning. Private-dage, middage og deltagelse i løb aftales løbende med din coach; egne rejse- og startgebyrer betales af dig, medmindre andet aftales.</p>
      </Section>
      <Section title="3. Priser og betaling">
        <p>{prices()}. Alle priser er inkl. moms. Månedlige medlemskaber betales forud for hver måned med betalingskort via Stripe og fornyes automatisk, indtil de opsiges. Private betales forud for 12 måneder.</p>
      </Section>
      <Section title="4. Opsigelse og skift af medlemskab">
        <p>Du kan opsige når som helst i appen under Mig → Medlemskab → Kort, kvitteringer og opsigelse. Opsigelsen gælder fra udgangen af den betalte måned, og du har adgang indtil da. Skifter du medlemskab, reguleres prisen forholdsmæssigt.</p>
      </Section>
      <Section title="5. Fortrydelsesret">
        <p>Som forbruger har du normalt 14 dages fortrydelsesret ved køb online. Ved køb accepterer du, at adgangen til appen og coachingen starter med det samme, og at fortrydelsesretten derfor bortfalder, når leveringen er påbegyndt (forbrugeraftalelovens § 18, stk. 2, nr. 13).</p>
      </Section>
      <Section title="6. Sundhed og ansvar">
        <p>Træning og øvelser i appen sker på eget ansvar. Indholdet er coaching og ikke medicinsk, psykologisk eller ernæringsfaglig behandling. Rådfør dig med en læge, hvis du har skader, sygdom, er gravid eller er i tvivl om din helbredstilstand. Sælger er ikke ansvarlig for skader, der opstår ved brug af appen, ud over hvad der følger af ufravigelig lovgivning.</p>
      </Section>
      <Section title="7. Brug af appen">
        <p>Din konto er personlig. Træningsvideoer og øvelser må ikke deles eller kopieres. Ved misbrug kan adgangen lukkes.</p>
      </Section>
      <Section title="8. Ændringer">
        <p>Prisændringer varsles mindst 30 dage før, de træder i kraft, så du kan nå at opsige.</p>
      </Section>
      <Section title="9. Klage">
        <p>Kontakt os først på <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Du kan også klage til <a href="https://www.forbrug.dk" target="_blank" rel="noopener">Nævnenes Hus</a> eller via EU-Kommissionens klageportal. Aftalen er underlagt lovgivningen i Wyoming, USA. Som forbruger bevarer du altid den beskyttelse, du har efter de ufravigelige forbrugerregler i dit bopælsland.</p>
      </Section>
    </>
  );
}

function TermsEN() {
  return (
    <>
      <h1>Terms of sale</h1>
      <p className="muted">Effective from {LEGAL_VERSION}</p>
      <Section title="1. Seller">
        <Company />
      </Section>
      <Section title="2. The service">
        <p>A monthly subscription to the {COACH_NAME} coaching app with daily check-ins, accountability with your coach and content according to your plan. Plans and their contents are described in the app under Membership.</p>
        <p><b>Perform</b>, <b>Elite</b> and <b>Private</b> require a free call and your coach’s approval first.</p>
        <p><b>Private</b> is a 12-month programme paid upfront. It does not renew automatically — you agree together whether to continue. The amount paid is not refunded if you stop early, unless mandatory law says otherwise. Private days, dinners and races are agreed with your coach along the way; your own travel and race entry fees are paid by you unless agreed otherwise.</p>
      </Section>
      <Section title="3. Prices and payment">
        <p>{prices()}. All prices include VAT. Monthly plans are paid in advance each month by card via Stripe and renew automatically until cancelled. Private is paid upfront for 12 months.</p>
      </Section>
      <Section title="4. Cancelling and changing plan">
        <p>Cancel any time in the app under Me → Membership → Card, receipts & cancel. Cancellation takes effect at the end of the paid month and you keep access until then. Plan changes are prorated.</p>
      </Section>
      <Section title="5. Right of withdrawal">
        <p>Consumers normally have a 14-day right of withdrawal for online purchases. When buying, you agree that access to the app and coaching starts immediately, and that the right of withdrawal therefore lapses once delivery has begun (Danish Consumer Contracts Act § 18(2)(13)).</p>
      </Section>
      <Section title="6. Health and liability">
        <p>Training and exercises in the app are at your own risk. The content is coaching, not medical, psychological or nutritional treatment. Consult a doctor if you have injuries, illness, are pregnant or are unsure about your health. The seller is not liable for injuries arising from use of the app beyond what follows from mandatory law.</p>
      </Section>
      <Section title="7. Use of the app">
        <p>Your account is personal. Workout videos and worksheets may not be shared or copied. Access may be closed in case of misuse.</p>
      </Section>
      <Section title="8. Changes">
        <p>Price changes are announced at least 30 days in advance so you can cancel in time.</p>
      </Section>
      <Section title="9. Complaints">
        <p>Contact us first at <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. You can also complain to the Danish Complaints Board (<a href="https://www.forbrug.dk" target="_blank" rel="noopener">Nævnenes Hus</a>) or via the EU Commission’s complaints portal. The agreement is governed by the laws of Wyoming, USA. As a consumer you always keep the protection of the mandatory consumer laws of the country where you live.</p>
      </Section>
    </>
  );
}

export default function Legal({ page }: { page: 'privacy' | 'terms' }) {
  const da = getLang() === 'da';
  return (
    <main className="app legal">
      <div className="stack">
        <a href="/" className="brandbar">
          <BrandLogo />
        </a>
        {page === 'privacy' ? (da ? <PrivacyDA /> : <PrivacyEN />) : da ? <TermsDA /> : <TermsEN />}
        <p className="muted small">
          <a href={PRIVACY_PATH}>{da ? 'Privatlivspolitik' : 'Privacy policy'}</a> · <a href={TERMS_PATH}>{da ? 'Handelsbetingelser' : 'Terms of sale'}</a> · <a href="/">{da ? 'Til appen' : 'Back to the app'}</a>
        </p>
      </div>
    </main>
  );
}
