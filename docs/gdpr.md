# GDPR — status og tjekliste (Simiglai LLC / Patrick Simiglai-appen)

*Udkast af 24. november 2026. Ikke juridisk rådgivning — få en advokat eller revisor til at kigge det igennem.*

## 1. Det, der allerede er på plads i appen ✅

| Krav | Sådan er det løst |
|---|---|
| **Udtrykkeligt samtykke til helbredsoplysninger** (art. 9) | Afkrydsning ved oprettelse; version + tidspunkt gemmes (`profiles.consent_version`, `consented_at`). |
| **Privatlivspolitik** (art. 13) | app.patricksimiglai.com/privatliv (dansk + engelsk). |
| **Ret til sletning** (art. 17) | “Slet min konto” i appen sletter alt med det samme og opsiger abonnementet. |
| **Dataminimering / formål** | Kun data, der bruges til coachingen. Ingen reklame-/sporingscookies. |
| **Data i EU** | Databasen ligger i EU (Frankfurt, Supabase). |
| **Adgangskontrol** (art. 32) | Klienter ser kun egne data; kun coachen ser klienter (row-level security, testet). Krypteret forbindelse (HTTPS). |
| **Markedsføringssamtykke** | Ventelisten kræver aktivt flueben; afmelding er mulig. |
| **Samtykke til at fortrydelsesretten bortfalder** | Gemmes på abonnementet i Stripe. |

## 2. Det, du skal gøre ✍️

### a) EU-repræsentant — eller dokumentér, at virksomheden drives fra Danmark
Simiglai LLC er en amerikansk virksomhed. GDPR art. 27 kræver en **EU-repræsentant**, hvis virksomheden **ikke er etableret i EU**.
- **Hvis du driver virksomheden fra Danmark** (du bor og arbejder her), er LLC’et efter al sandsynlighed *etableret i EU* via dig → så gælder GDPR fuldt ud med **Datatilsynet** som tilsyn, og der er normalt **ikke** brug for en EU-repræsentant.
- **Hvis ikke**, skal du udpege en EU-repræsentant skriftligt (tjenester som fx Prighter, DataRep eller VeraSafe — ca. 100–300 € om året) og skrive den i privatlivspolitikken.

✅ **Valgt:** Patrick Simiglai (bosat i Danmark) er udpeget som Simiglai LLC’s repræsentant i EU. Underskriv udpegelsen i `docs/eu-representative.md`, og gem den.

### b) Databehandleraftaler (DPA) med leverandørerne
Du skal have en databehandleraftale med alle, der behandler klientdata for dig. De fleste har en standardaftale, du accepterer:
- **Supabase** (database/login): Dashboard → Organization → **Legal documents** → *Data Processing Addendum* → underskriv.
- **Stripe** (betaling): DPA’en er en del af Stripes vilkår (stripe.com/legal/dpa) — intet at gøre, men gem et link.
- **Netlify** (hosting), **Resend** (e-mail), **Calendly** (booking): søg efter “DPA” på deres side; typisk accepteret via vilkårene. Gem en kopi.

### c) Slå to-faktor-login (2FA) til
På **Supabase, Stripe, Netlify, Resend, Simply og Calendly**. Det er den vigtigste sikkerhedsforanstaltning, du selv kan lave.

### d) Gem fortegnelsen (afsnit 3) og hold den opdateret
Den skal kunne fremvises, hvis Datatilsynet spørger.

### e) Hvis noget går galt (databrud)
Hvis klientdata kommer i forkerte hænder: **anmeld til Datatilsynet inden 72 timer** (datatilsynet.dk → Anmeld brud) og informér de berørte klienter, hvis der er høj risiko for dem. Skriv kort ned, hvad der skete, og hvad du gjorde.

## 3. Fortegnelse over behandlingsaktiviteter (art. 30) — udkast

| | |
|---|---|
| **Dataansvarlig** | Simiglai LLC, 1309 Coffeen Ave, Suite 1200, Sheridan, WY 82801, USA · ps@patricksimiglai.com · kontaktperson: Patrick Simiglai |
| **EU-repræsentant** | Patrick Simiglai, Danmark · ps@patricksimiglai.com *(udpeget skriftligt — se `docs/eu-representative.md`; tilføj dansk adresse)* |

| Behandling | Formål | Kategorier af data | Registrerede | Retsgrundlag | Modtagere / databehandlere | Opbevaring |
|---|---|---|---|---|---|---|
| **Klientkonto** | Levere appen | Navn, e-mail, adgangskode (krypteret), sprog, valuta | Klienter | Art. 6(1)(b) aftale | Supabase (EU) | Til kontoen slettes |
| **Daglige check-ins, mål, ugentlige evalueringer, mentale øvelser** | Coaching og opfølgning | Humør, energi, søvn, træning, kost, refleksioner, mål (**helbredsoplysninger**) | Klienter | Art. 9(2)(a) udtrykkeligt samtykke | Supabase (EU); kun coachen har adgang | Til kontoen slettes |
| **Chat med coach** | Accountability | Beskeder | Klienter, coach | Art. 6(1)(b) aftale | Supabase (EU) | Til kontoen slettes |
| **Betaling og abonnement** | Opkrævning | Navn, e-mail, betalingsstatus (kortdata kun hos Stripe) | Klienter | Art. 6(1)(b) + 6(1)(c) regnskab | Stripe (EU/USA, DPF/SCC) | Fakturaer efter regnskabsregler (typisk 5–7 år) |
| **E-mails fra appen** | Bekræftelse, nulstilling af adgangskode | E-mail, navn | Klienter | Art. 6(1)(b) aftale | Resend (USA, SCC/DPF) | Logs i kort tid hos Resend |
| **Venteliste / nyhedsbrev** | Lancering og tilbud | Navn, e-mail, sprog, kilde | Interesserede | Art. 6(1)(a) samtykke | Supabase (EU) | Til afmelding |
| **Booking af samtale** | Afklaringssamtale | Navn, e-mail, tidspunkt | Interesserede/klienter | Art. 6(1)(b) før aftale | Calendly (USA) | Efter Calendlys indstillinger |
| **Hosting af appen** | Drift | IP-adresse i serverlogs | Besøgende | Art. 6(1)(f) legitim interesse (drift og sikkerhed) | Netlify (USA, SCC/DPF) | Kort tid |

**Tekniske og organisatoriske sikkerhedsforanstaltninger:** krypteret forbindelse (HTTPS); kryptering af data i hvile hos Supabase; adgang kun for klienten selv og coachen (row-level security); adgangskoder gemmes krypteret; 2FA på alle administratorkonti *(slå til — se 2c)*; ingen deling af data med tredjepart til markedsføring; sletning på klientens anmodning direkte i appen; daglig backup ved Supabase Pro *(anbefales)*.
