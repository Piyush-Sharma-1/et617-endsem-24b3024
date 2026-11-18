// Vercel serverless function: AI feedback on a learner's explanation (D6).
// Input:  { variable: 'L'|'m'|'A', explanation: string, runs: [{L,m,A,T}] }
// Output: { verdict: 'correct'|'partial'|'misconception', misconception: 'M1'|'M2'|null, feedback: string }
// The key lives only in the Vercel env var ANTHROPIC_API_KEY. If it is missing or anything fails,
// we return 503 and the browser uses its rule-based fallback (labelled "Quick check · rule-based").
import Anthropic from '@anthropic-ai/sdk';

const TOPIC = {
  L: 'string length. Truth: longer string -> longer period; 4x length -> 2x period (T = 2*pi*sqrt(L/g)).',
  m: 'bob mass. Truth: mass does NOT change the period. Misconception M1: "a heavier bob swings faster".',
  A: 'swing angle (amplitude), small angles 5-30 degrees. Truth: period stays about the same. Misconception M2: "a bigger swing takes more time".',
};

const SYSTEM = `You give feedback to Sunita, a 14-year-old Class 9 student in a rural Marathi-medium school in Maharashtra.
She has just run a virtual pendulum experiment and written why a variable does or does not change the period.
Her English is basic and she may mix Marathi or Hindi words; never mark language or spelling, only the physics idea.
Rules for "feedback": at most 2 short sentences, at most 40 words, simple English, warm and encouraging, speak to her as "you".
Refer to her own run numbers when helpful. Do not give a formula. If she is wrong, ask her to look at a specific column or pair of runs instead of telling the answer.
Reply with ONLY a JSON object: {"verdict":"correct"|"partial"|"misconception","misconception":"M1"|"M2"|null,"feedback":"..."}.
"correct" = right idea supported by data; "partial" = right idea without evidence or unclear; "misconception" = states M1 or M2 or another wrong rule.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { variable, explanation, runs } = req.body || {};
  if (!TOPIC[variable] || typeof explanation !== 'string' || explanation.length > 1000) {
    return res.status(400).json({ error: 'bad input' });
  }
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'no AI key' });

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Variable tested: ${TOPIC[variable]}\nHer runs (L cm, m g, A deg, period s): ${JSON.stringify((runs || []).slice(-6))}\nHer explanation: """${explanation}"""`,
      }],
    }, { timeout: 8000, maxRetries: 0 });

    if (msg.stop_reason === 'refusal') throw new Error('refusal');
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const out = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));

    // Check the output before the learner sees it
    const okVerdict = ['correct', 'partial', 'misconception'].includes(out.verdict);
    const okMis = out.misconception == null || ['M1', 'M2'].includes(out.misconception);
    const okText = typeof out.feedback === 'string' && out.feedback.length > 0 && out.feedback.length <= 320;
    const leaksFormula = /sqrt|√|2\s*\*?\s*pi|2π/i.test(out.feedback || '');
    if (!okVerdict || !okMis || !okText || leaksFormula) throw new Error('failed checks');

    return res.status(200).json({ verdict: out.verdict, misconception: out.misconception || null, feedback: out.feedback });
  } catch (e) {
    return res.status(503).json({ error: 'ai failed' });
  }
}
