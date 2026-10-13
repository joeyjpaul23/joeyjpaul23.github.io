# Joey's portfolio

A single-page portfolio with an interactive 3D orbit. Drag to rotate, scroll to zoom, and click a planet to open its landscape. Each destination has its own climate: a lake and cabin, a ridged basin, a stand of trees, or a quiet shore. The light follows your own clock, so the scene is lit for whatever hour you visit. The other destinations remain clickable in the sky; “Back to orbit” returns to the solar system.

Catch Starship in the orbit (or press `F`) to fly it: a small game where you ride the ship out through the belt to each page's world, dodging rock, flying through rings and clearing drones. Arrive at a world and you can land on that page.

## Run
Open `index.html` in a browser. No build step or dependencies (fonts load from Google Fonts).

## Edit
- Page text: `index.html` (About, Projects, Experience, Skills, Contact sections)
- **What Ask Joey knows: `profile.js`.** Facts, not written answers — add one and every phrasing of that question starts working. The `pending` block near the bottom is the list Joey still has to fill in; an empty `value` makes the panel say so rather than invent something.
- Content follows the 2026–27 resume. Photos on the Experience sub-pages are still placeholders (`.ph`); swap in an `<img>` to add one.
- Orbit labels, speeds, and tilts: the `M` array in `script.js`
- Colors and theme: the `:root` variables in `style.css`
- Flight (the game): `game.js`; worlds, pacing and scoring are near the top
- Landing after "Land here": `landingPose` and `liftOff` in `script.js`; the pad is chosen at the end of `paintSurface`

## Ask Joey
The About page answers questions about Joey from `profile.js`, using a small retrieval model in
`ask.js` that runs in the tab — no key, no network, no build step. It says so when he hasn't
written something down rather than guessing.

Visitors can also turn on a real language model that runs **on their own device**: `ask-llm.js`
loads Qwen2.5 0.5B Instruct through [WebLLM](https://github.com/mlc-ai/web-llm) on the GPU
(WebGPU), in a worker so the page never drops a frame. It is opt-in from a line under the Ask
description (a ~290 MB download, once; the browser caches it and a returning visitor gets it back
automatically), and it is only offered where WebGPU works. It only rewords: `ask.js` still picks
the facts and hands the model the locally written answer as a draft, and a reply is shown only if
it speaks as Joey, adds no figure and adds almost no word that isn't in those facts. Otherwise the
local answer is shown. Questions never leave the tab. To change the model, set `MODEL`, `NAME` and
`SIZE` at the top of `ask-llm.js` to another WebLLM prebuilt model id. Serve the site over http(s)
for the worker; opened from disk it runs on the main thread instead.

Optionally a hosted model can do the phrasing instead: deploy `worker/` (Workers AI, no API key) and set
`PROXY` at the top of `ask.js`. Retrieval, the unanswered check and a guard that rejects any
figure the model invented all stay on the client, and anything slow or failed falls back to the
local answer. See `worker/README.md`.

## Live satellites
The Projects demo and the `iss`/`sats` commands use `sats.js`: four real satellites (ISS, Hubble, Tiangong, Starlink-1008) propagated in the browser with satellite.js from CelesTrak's public elements, fetched at most every 12 hours with a built-in snapshot as fallback. It only loads when Projects opens or a command asks. To change the satellites, edit `LIST` (catalog number and a current two-line element set from celestrak.org).

## Hosting
The site is static and is served free by GitHub Pages from the `joeyjpaul23.github.io` repository (`main` branch, root), at https://joeyjpaul23.github.io/. To publish a change, copy this folder into that repository and push. Pages serves it over HTTPS, which the on-device Ask model needs. Set `DEV=false` in `dev.js` first.

## Design
See `DESIGN.md` for the theme, colors, typography, motion rules, and how to add new pages so they match.

## Keys
`/` (or ⌘K / Ctrl K, or the `>_` button) opens the command line (`cmd.js`): page and role names, `fly`, `iss`, `sats`, `theme`, `email`, `github`, `linkedin`, `help`, and anything else is asked of Ask Joey. `1` to `5` open pages in order (`3` is Experience), `←`/`→` step between them, `Esc` or `0` returns home, `F` launches Flight. Each page has its own address (`#about`, `#projects`, …), so Back/Forward and shared links work. In Flight: arrows/WASD or mouse to steer, Space or click to fire, Shift to boost, `Esc` or `P` to pause. The sun/moon button at the top right switches light and dark mode.

## Development shortcuts
`dev.js` adds testing shortcuts, all behind one flag. Press `` ` `` (or click DEV in the corner) for the list with live stats. They use Option (Alt) plus a key:

- Anywhere: `⌥[` / `⌥]` slow down or speed up time (¼× to 8×), `⌥0` resets time and the clock.
- Orbit: `⌥1`–`⌥5` land Starship on that page, `⌥F` launches Flight straight into play, `⌥H` moves the sun three hours on (`⌥⇧H` back to the real clock).
- Flight: `⌥1`–`⌥5` fly toward that world, `⌥N` arrive now, `⌥L` arrive and land, `⌥G` invincible, `⌥R` rock on a collision course (`⌥⇧R` big), `⌥E` drone, `⌥I` ring, `⌥U` refill, `⌥X` game over.

Turn it off before shipping: set `DEV=false` at the top of `dev.js`, or delete its `<script>` line in `index.html`. `?dev=0` or `?dev=1` in the URL overrides the flag for one visit.

## Verify
Run `node --test tests/*.test.cjs` from this folder. Regression checks cover the full-flight engine flame, stable orbit radius, viewport containment during navigation/rotation/zoom, label overlap, landing and sky navigation, return to orbit, reduced motion, full-width terrain, and terrain cache invalidation, launching Flight from the ship, landing and takeoff after "Land here" (a dry pad on every world), and the game itself (camera intro, a lane that grows with the screen, collision marking, lasers, rock splitting, collisions and grace, rings and repairs, arrival and landing, drones, and finite drawing at phone and desktop sizes).

The Ask Joey tests cover question normalising, intent, that paraphrases reach the same fact, that every fact is reachable, that an unanswered fact is admitted rather than invented, that suggestions only offer answerable questions, that off-topic questions and commands are declined, and that follow-ups carry context.
