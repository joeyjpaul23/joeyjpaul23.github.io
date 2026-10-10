/* Run the real worker locally, so the page's whole remote path can be checked before anything
 * is deployed. It imports joey-ask.js unchanged and supplies the bindings Cloudflare would.
 *
 *   node worker/dev-server.mjs              stub model, answers normally
 *   node worker/dev-server.mjs --wrong      stub invents a figure (proves the grounding guard)
 *   node worker/dev-server.mjs --slow       stub takes 8s (proves the timeout fallback)
 *   GEMINI_KEY=... node worker/dev-server.mjs    the real thing, against Gemini's free tier
 *
 * Then, in the page's console:  Ask.configure({ proxy: "http://localhost:8788" })
 */
import http from "node:http";
import worker from "./joey-ask.js";

const PORT = Number(process.env.PORT || 8788);
const KEY = process.env.GEMINI_KEY || "";
const WRONG = process.argv.includes("--wrong");
const SLOW = process.argv.includes("--slow");

/* Stands in for the Workers AI binding. It does not paraphrase well — it does not need to.
   What it proves is the contract: request shape, CORS, validation, and the client's guards. */
const stubAI = {
  async run(model, { messages }) {
    if (SLOW) await new Promise(r => setTimeout(r, 8000));
    const facts = (messages[0]?.content ?? "").split("FACTS:")[1]?.trim() ?? "";
    if (WRONG) return { response: "He manages $42M across 7 funds and graduated in 2017." };
    const first = facts.split(/(?<=\.)\s+/).slice(0, 2).join(" ");
    return { response: first || "Nothing to say." };
  }
};

const env = KEY ? { GEMINI_KEY: KEY } : { AI: stubAI };

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const request = new Request("http://localhost:" + PORT + req.url, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : body
  });
  let out;
  try {
    out = await worker.fetch(request, env);
  } catch (err) {
    out = new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
  if (req.method === "POST") {
    let question = "?";
    try { question = JSON.parse(body.toString()).question; } catch {}
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${out.status}  ${question}`);
  }
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(Buffer.from(await out.arrayBuffer()));
});

server.listen(PORT, () => console.log(
  `worker on http://localhost:${PORT}  (${KEY ? "Gemini" : "stub"}${WRONG ? ", inventing figures" : ""}${SLOW ? ", slow" : ""})`));
