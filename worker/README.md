# Ask Joey — model proxy (optional)

The About page answers questions with a retrieval model that runs in the visitor's tab. This
worker is optional: it swaps that model's *phrasing* for a hosted one while leaving the parts
that keep it honest on the client.

**Without it nothing is broken.** The page needs no network, no key and no build step, which is
the property worth protecting. Deploy this only if you want the answers to read more naturally.

## Turn it on

```sh
cd worker
npx wrangler login      # opens a browser; only you can do this
npx wrangler deploy
```

Workers AI needs **no API key** — the `AI` binding is the credential, so nothing can leak into
the page. Deploy prints a URL. Put it at the top of `ask.js`:

```js
var PROXY = "https://joey-ask.<your-subdomain>.workers.dev";
```

Set it back to `""` and the site is fully static again.

To use Gemini's free tier instead of Workers AI: `npx wrangler secret put GEMINI_KEY`.

## Try it before you deploy

`dev-server.mjs` runs this exact worker locally with a stub model, so the whole path can be
checked without an account:

```sh
node worker/dev-server.mjs           # answers normally
node worker/dev-server.mjs --wrong   # invents a figure — the page must reject it
node worker/dev-server.mjs --slow    # takes 8s — the page must give up and answer locally
```

Then in the page's console: `Ask.configure({ proxy: "http://localhost:8788" })`.

All three are covered by `tests/ask-remote.test.cjs`, so you don't have to do it by hand.

## What stays on the client

- Which facts are retrieved (`ask.js`), and only those are sent — never the whole profile, and
  never a fact that is not genuinely in contention for the question.
- **A question Joey has not answered is never sent.** The model is never in a position to fill a
  gap for him.
- **A figure in the reply that is not in the facts that were sent counts as invented**, and the
  locally built answer is used instead.
- The fallback. Slow, rate-limited, failed, malformed or ungrounded — the visitor sees the local
  answer and no error.

## Before you leave it running

- **Lock the origin.** `access-control-allow-origin` is `*` so it works from a local file. Once
  the site has a domain, set it to that domain in `joey-ask.js`.
- **Rate limiting.** Cloudflare's own limiter is commented out in `wrangler.toml` because the
  syntax for that binding has moved between wrangler versions; uncomment it once you've checked
  the current form. Until then the worker falls back to an in-isolate counter (15/min per
  address), which is a speed bump, not a guarantee.
- **Free tiers usually train on what you send them,** and visitors' questions leave your site.
  Ask the panel "are you an llm" — it tells the visitor there's a hosted model as soon as `PROXY`
  is set. Keep that honest if you change providers.
- `MODEL` in `joey-ask.js` is a Workers AI model id; `npx wrangler ai models` lists the current
  catalogue, and ids do change.

## Check a deployed worker

```sh
curl -s -X POST https://joey-ask.<your-subdomain>.workers.dev \
  -H 'content-type: application/json' \
  -d '{"question":"what did you do at pathlight","facts":"Pathlight Project. I was a machine learning and backend engineer."}'
```

`{"answer": "..."}` means it works. Anything else and the page quietly uses its own model.
