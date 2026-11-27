// Health & nutrition agent, powered by Claude.
//   { action: 'meal',   photoPath?, text? }  → estimated macros for a meal photo and/or description (nothing is saved)
//   { action: 'ask',    question }           → the agent reads your data with tools and answers; saved to health_reports
//   { action: 'weekly' }                     → a full weekly analysis; saved to health_reports
// Every data read goes through the caller's own Supabase session, so row-level security limits the agent to their data.
// Needs the Supabase secret ANTHROPIC_API_KEY. Access: the coach account, plus Perform/Elite clients once
// HEALTH_AGENT_FOR_CLIENTS=true is set as a secret.
import Anthropic from 'npm:@anthropic-ai/sdk@1.12.0';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-opus-5-5';
const MAX_TOOL_ROUNDS = 8;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

// Server-side refusal fallback: if a safety classifier declines, the API retries on a recommended model in the same call.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01' as const], fallbacks: 'default' as const };

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => isoDate(new Date(Date.now() - n * 86_400_000));
const clampRange = (from?: string, to?: string) => {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  return { from: from && re.test(from) ? from : daysAgo(30), to: to && re.test(to) ? to : isoDate(new Date()) };
};

// ───────────────────────────── tools the agent can call ─────────────────────────────
const RANGE: Anthropic.Beta.BetaTool.InputSchema = {
  type: 'object',
  properties: {
    from: { type: 'string', description: 'First day, YYYY-MM-DD (inclusive). Default: 30 days ago.' },
    to: { type: 'string', description: 'Last day, YYYY-MM-DD (inclusive). Default: today.' },
  },
  required: [] as string[],
  additionalProperties: false,
};

const TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: 'get_metrics', description: 'Daily body metrics: weight, body fat %, waist, resting heart rate, HRV, steps, active kcal, sleep hours, energy (1-5), notes. Sources: manual entries and Apple Health imports. Days without data are absent.', input_schema: RANGE },
  { name: 'get_meals', description: 'Logged meals with time, type, description and kcal / protein / carbs / fat / fiber (some estimated by AI from photos), plus per-day totals.', input_schema: RANGE },
  { name: 'get_checkins', description: 'Daily check-ins from the planner: sleep hours, mood (1-5), energy (1-5), water glasses, planned meals, training done + notes, day rating (1-10), wins and lessons.', input_schema: RANGE },
  { name: 'get_trends', description: 'Pre-computed statistics per metric over a range: count, average, min, max, first/last value, and the linear trend per week. Use this for "is X going up/down" questions instead of eyeballing raw rows.', input_schema: RANGE },
  { name: 'get_supplements', description: 'The user’s supplement plan (name, dose, time slot, note, paused or not) and which supplements were ticked off as taken on each day in the range, with adherence per day. Slots: morning (with fatty breakfast), prerun (30-60 min before activity), lunch (with food), afternoon (iron, alone), evening (before bed).', input_schema: RANGE },
  { name: 'get_goals', description: 'Long-term goals (with area, why, target date, milestones) and the nutrition targets + personal context the user set.', input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false } },
];

type Row = Record<string, unknown>;

async function getMetrics(db: SupabaseClient, uid: string, from: string, to: string) {
  const { data, error } = await db.from('health_metrics').select('date, weight_kg, body_fat_pct, waist_cm, resting_hr, hrv_ms, steps, active_kcal, sleep_hours, energy, notes, source')
    .eq('user_id', uid).gte('date', from).lte('date', to).order('date');
  if (error) throw error;
  return (data ?? []).map((r: Row) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null && v !== '')));
}

async function getMeals(db: SupabaseClient, uid: string, from: string, to: string) {
  const { data, error } = await db.from('health_meals').select('eaten_at, meal, description, kcal, protein_g, carbs_g, fat_g, fiber_g, ai')
    .eq('user_id', uid).gte('eaten_at', `${from}T00:00:00Z`).lte('eaten_at', `${to}T23:59:59Z`).order('eaten_at');
  if (error) throw error;
  const meals = (data ?? []).map((m: Row) => ({
    at: m.eaten_at, meal: m.meal, description: m.description, kcal: m.kcal, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g, fiber_g: m.fiber_g,
    estimated_by_ai: !!m.ai,
  }));
  const totals: Record<string, { kcal: number; protein_g: number; carbs_g: number; fat_g: number; meals: number }> = {};
  for (const m of meals) {
    const d = String(m.at).slice(0, 10);
    const t = (totals[d] ??= { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, meals: 0 });
    t.kcal += Number(m.kcal ?? 0); t.protein_g += Number(m.protein_g ?? 0); t.carbs_g += Number(m.carbs_g ?? 0); t.fat_g += Number(m.fat_g ?? 0); t.meals++;
  }
  return { meals, daily_totals: totals };
}

async function getCheckins(db: SupabaseClient, uid: string, from: string, to: string) {
  const { data, error } = await db.from('days').select('date, data').eq('user_id', uid).gte('date', from).lte('date', to).order('date');
  if (error) throw error;
  return (data ?? []).map(({ date, data: d }: { date: string; data: Row }) => ({
    date, sleep_hours: d.sleepHours, mood: d.mood, energy: d.energy, water_glasses: d.water, meals_planned: d.meals,
    training: d.training, rating: d.rating, wins: d.wins, lesson: d.lesson,
  }));
}

function stats(points: { x: number; y: number }[]) {
  if (!points.length) return null;
  const ys = points.map((p) => p.y);
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = ys.reduce((a, y) => a + y, 0) / n;
  const sxx = points.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  const slopePerDay = n > 2 && sxx > 0 ? points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / sxx : null;
  const r = (v: number) => Math.round(v * 100) / 100;
  return { count: n, avg: r(my), min: r(Math.min(...ys)), max: r(Math.max(...ys)), first: r(ys[0]), last: r(ys[n - 1]), trend_per_week: slopePerDay === null ? null : r(slopePerDay * 7) };
}

async function getTrends(db: SupabaseClient, uid: string, from: string, to: string) {
  const [metrics, { daily_totals }] = await Promise.all([getMetrics(db, uid, from, to), getMeals(db, uid, from, to)]);
  const day = (d: string) => Date.parse(d) / 86_400_000;
  const series = (key: string) => metrics.filter((m) => m[key] != null).map((m) => ({ x: day(String(m.date)), y: Number(m[key]) }));
  const out: Record<string, unknown> = { range: { from, to } };
  for (const k of ['weight_kg', 'body_fat_pct', 'waist_cm', 'resting_hr', 'hrv_ms', 'steps', 'active_kcal', 'sleep_hours', 'energy']) out[k] = stats(series(k));
  const food = Object.entries(daily_totals).sort();
  for (const k of ['kcal', 'protein_g', 'carbs_g', 'fat_g'] as const) out[`intake_${k}`] = stats(food.map(([d, t]) => ({ x: day(d), y: t[k] })));
  out.note = 'intake_* only counts days with at least one logged meal; partially logged days pull the average down.';
  return out;
}

async function getGoals(db: SupabaseClient, uid: string) {
  const [{ data: goals }, { data: settings }] = await Promise.all([
    db.from('goals').select('data').eq('user_id', uid),
    db.from('health_settings').select('*').eq('user_id', uid).maybeSingle(),
  ]);
  return { goals: (goals ?? []).map((g: { data: Row }) => g.data), nutrition_targets_and_context: settings ?? 'not set' };
}

async function getSupplements(db: SupabaseClient, uid: string, from: string, to: string) {
  const [{ data: plan, error }, { data: log }] = await Promise.all([
    db.from('health_supplements').select('id, slot, name, dose, note, active').eq('user_id', uid).order('slot').order('sort'),
    db.from('health_supplement_log').select('date, supplement_id').eq('user_id', uid).gte('date', from).lte('date', to).order('date'),
  ]);
  if (error) throw error;
  const names = Object.fromEntries((plan ?? []).map((p: Row) => [p.id, p.name]));
  const activeCount = (plan ?? []).filter((p: Row) => p.active).length;
  const byDay: Record<string, string[]> = {};
  for (const l of log ?? []) (byDay[l.date] ??= []).push(String(names[l.supplement_id] ?? '?'));
  return {
    plan: (plan ?? []).map(({ id: _id, ...p }: Row) => p),
    taken_by_day: Object.entries(byDay).map(([date, taken]) => ({ date, taken, adherence: activeCount ? `${taken.length}/${activeCount}` : null })),
    note: 'Days missing from taken_by_day had nothing ticked off — the user may simply not have logged.',
  };
}

async function runTool(db: SupabaseClient, uid: string, name: string, input: { from?: string; to?: string }) {
  const { from, to } = clampRange(input?.from, input?.to);
  switch (name) {
    case 'get_metrics': return getMetrics(db, uid, from, to);
    case 'get_meals': return getMeals(db, uid, from, to);
    case 'get_checkins': return getCheckins(db, uid, from, to);
    case 'get_trends': return getTrends(db, uid, from, to);
    case 'get_supplements': return getSupplements(db, uid, from, to);
    case 'get_goals': return getGoals(db, uid);
    default: throw new Error(`Unknown tool ${name}`);
  }
}

// ───────────────────────────── the agent ─────────────────────────────
const SYSTEM = `You are a personal health and nutrition analyst inside a coaching app. The user logs body metrics (manually and from Apple Health), meals (often with AI-estimated macros from photos), supplements and daily check-ins.

How to work:
- Look at the data before answering: call the tools you need (you may call several at once). Use get_trends for trend questions.
- Ground every claim in the user's numbers, and say how much data it rests on (e.g. "based on 9 of the last 14 days"). If data is missing or too sparse, say so and tell them exactly what to log.
- Look for relationships across sources — e.g. sleep vs. energy, protein vs. training days, weekend vs. weekday intake, weight trend vs. calorie average.
- When supplements are relevant, check their timing rules (iron alone and away from zinc/magnesium/calcium/coffee; fat-soluble ones with a fatty meal; collagen + vitamin C 30-60 min before activity) and note that supplement advice is not medical advice.
- AI-estimated meal macros can be off by 20-30%; treat them as approximations.
- Give 2-4 concrete, prioritised actions. Be direct and encouraging, like a good coach — no filler.
- You are not a doctor. If something looks medically concerning (e.g. very low intake, resting heart rate rising sharply for days, rapid unexplained weight change, chest pain or similar mentioned in notes), say plainly that they should check with a doctor.
- Reply in the user's language (Danish or English, as they write). Use short paragraphs and simple markdown (bold, bullet lists). Keep it under about 350 words unless asked for more.`;

const WEEKLY_PROMPT = `Write my weekly health review for the last 7 days, compared with the 3 weeks before. Cover: body (weight/waist trend, resting HR, HRV), sleep and recovery, nutrition vs. my targets (energy, protein, consistency of logging), activity/training, and how my energy and mood tracked with these. End with my 3 priorities for next week.`;

async function runAgent(db: SupabaseClient, uid: string, question: string, history: Anthropic.Beta.BetaMessageParam[], lang: string) {
  const today = isoDate(new Date());
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history,
    { role: 'user', content: `Today is ${today}. Preferred language: ${lang === 'da' ? 'Danish' : 'English'}.\n\n${question}` },
  ];
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: TOOLS,
      messages,
      ...FALLBACK,
    });
    if (res.stop_reason === 'refusal') return 'Sorry — I can’t help with that one. Try rephrasing the question.';
    // keep the full content (thinking blocks included) so the next round sees exactly what the model produced
    messages.push({ role: 'assistant', content: res.content });
    const calls = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || !calls.length || round === MAX_TOOL_ROUNDS) {
      const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
      if (text) return text;
      if (round === MAX_TOOL_ROUNDS) return 'I looked at a lot of data but ran out of steps — try a narrower question.';
      return 'I couldn’t produce an answer — please try again.';
    }
    const results = await Promise.all(calls.map(async (c): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
      try {
        return { type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(await runTool(db, uid, c.name, c.input as { from?: string; to?: string })) };
      } catch (e) {
        return { type: 'tool_result', tool_use_id: c.id, is_error: true, content: e instanceof Error ? e.message : 'Tool failed' };
      }
    }));
    messages.push({ role: 'user', content: results }); // all results in one message
  }
  return 'Something went wrong — please try again.';
}

// ───────────────────────────── meal estimate ─────────────────────────────
const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, grams: { type: 'number' }, kcal: { type: 'number' }, protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' } },
        required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
        additionalProperties: false,
      },
    },
    description: { type: 'string', description: 'Short description of the whole meal, in the user’s language' },
    kcal: { type: 'number' }, protein_g: { type: 'number' }, carbs_g: { type: 'number' }, fat_g: { type: 'number' }, fiber_g: { type: 'number' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    notes: { type: 'string', description: 'Assumptions made (portion size, hidden oil, sauces) and anything worth knowing, in one or two sentences' },
  },
  required: ['items', 'description', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'confidence', 'notes'],
  additionalProperties: false,
};

async function estimateMeal(db: SupabaseClient, uid: string, photoPath: string | undefined, text: string, lang: string) {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (photoPath) {
    if (!photoPath.startsWith(`${uid}/`)) throw new Error('Not your photo.');
    const { data, error } = await db.storage.from('meal-photos').download(photoPath);
    if (error || !data) throw new Error('Could not read the photo.');
    const bytes = new Uint8Array(await data.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const type = (['image/jpeg', 'image/png', 'image/webp'].includes(data.type) ? data.type : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';
    content.push({ type: 'image', source: { type: 'base64', media_type: type, data: btoa(bin) } });
  }
  content.push({
    type: 'text',
    text: `Estimate the nutrition of this meal${photoPath ? ' from the photo' : ''}. ${text ? `The user says: "${text}". Trust their stated foods and amounts over what you see.` : ''} Estimate realistic portion sizes, include cooking oil and sauces you can reasonably assume, and use standard nutrition values. Write description and notes in ${lang === 'da' ? 'Danish' : 'English'}.`,
  });
  const res = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: MEAL_SCHEMA } },
    messages: [{ role: 'user', content }],
    ...FALLBACK,
  });
  if (res.stop_reason === 'refusal') throw new Error('Could not analyse this meal.');
  const out = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text');
  if (!out) throw new Error('No estimate returned — try again.');
  return JSON.parse(out.text);
}

// ───────────────────────────── handler ─────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'The health agent is not configured yet (missing ANTHROPIC_API_KEY).' }, 503);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await db.auth.getUser();
    if (!user) return json({ error: 'Please log in again.' }, 401);

    const { data: profile } = await db.from('profiles').select('role, plan, plan_status, language').eq('id', user.id).single();
    const clientsAllowed = Deno.env.get('HEALTH_AGENT_FOR_CLIENTS') === 'true';
    const allowed = profile?.role === 'coach' ||
      (clientsAllowed && ['active', 'trialing'].includes(profile?.plan_status) && ['perform', 'elite', 'private'].includes(profile?.plan));
    if (!allowed) return json({ error: 'The health agent is part of Perform and Elite.' }, 403);
    const lang = profile?.language === 'da' ? 'da' : 'en';

    const body = await req.json().catch(() => ({}));
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (body.action === 'meal') {
      const text = typeof body.text === 'string' ? body.text.slice(0, 1000) : '';
      if (!body.photoPath && !text) return json({ error: 'Add a photo or describe the meal.' }, 400);
      return json({ estimate: await estimateMeal(db, user.id, body.photoPath, text, lang) });
    }

    if (body.action === 'ask' || body.action === 'weekly') {
      const weekly = body.action === 'weekly';
      const question = weekly ? WEEKLY_PROMPT : String(body.question ?? '').trim().slice(0, 2000);
      if (!question) return json({ error: 'Ask a question.' }, 400);
      // short memory: the last few exchanges, as plain text
      const { data: past } = await db.from('health_reports').select('question, answer').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4);
      const history: Anthropic.Beta.BetaMessageParam[] = (past ?? []).reverse().flatMap((r: { question: string; answer: string }) => [
        { role: 'user' as const, content: r.question },
        { role: 'assistant' as const, content: r.answer },
      ]);
      const answer = await runAgent(db, user.id, question, history, lang);
      const { data: saved } = await admin.from('health_reports')
        .insert({ user_id: user.id, kind: weekly ? 'weekly' : 'chat', question: weekly ? 'Weekly review' : question, answer })
        .select('id, kind, question, answer, created_at').single();
      return json({ report: saved ?? { kind: weekly ? 'weekly' : 'chat', question, answer, created_at: new Date().toISOString() } });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'The agent is busy — try again in a minute.' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `AI service error (${e.status ?? 'network'}) — try again.` }, 502);
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
