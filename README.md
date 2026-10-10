# Joey's portfolio

A single-page portfolio with an interactive 3D orbit. Drag to rotate, scroll to zoom, and click a planet to approach its landscape. Each destination has its own climate: a lake and cabin, a ridged basin, a stand of trees, or a quiet shore. The light follows your own clock, so the scene is lit for whatever hour you visit. The other destinations remain clickable in the sky; “Back to orbit” returns to the solar system.

Catch Starship in the orbit (or press `F`) to fly it: a small game where you ride the ship out through the belt to each page's world, dodging rock, flying through rings and clearing drones. Arrive at a world and you can land on that page.

## Run
Open `index.html` in a browser. No build step or dependencies (fonts load from Google Fonts).

## Edit
- Page text: `index.html` (About, Projects, Experience, Skills, Contact sections)
- **What Ask Joey knows: `profile.js`.** Facts, not written answers — add one and every phrasing of that question starts working. The `pending` block near the bottom is the list Joey still has to fill in; an empty `value` makes the panel say so rather than invent something.
- Placeholders to replace: second project, email, GitHub and LinkedIn links (the email also appears in `profile.js`)
- Orbit labels, speeds, and tilts: the `M` array in `script.js`
- Colors and theme: the `:root` variables in `style.css`
- Flight (the game): `game.js`; worlds, pacing and scoring are near the top
- Landing after "Land here": `landingPose` and `liftOff` in `script.js`; the pad is chosen at the end of `paintSurface`

## Ask Joey
The About page answers questions about Joey from `profile.js`, using a small retrieval model in
`ask.js` that runs in the tab — no key, no network, no build step. It says so when he hasn't
written something down rather than guessing.

Optionally a hosted model can do the phrasing: deploy `worker/` (Workers AI, no API key) and set
`PROXY` at the top of `ask.js`. Retrieval, the unanswered check and a guard that rejects any
figure the model invented all stay on the client, and anything slow or failed falls back to the
local answer. See `worker/README.md`.

## Design
See `DESIGN.md` for the theme, colors, typography, motion rules, and how to add new pages so they match.

## Keys
`1` to `5` open pages in order (`3` is Experience), `Esc` or `0` returns home, `F` launches Flight. In Flight: arrows/WASD or mouse to steer, Space or click to fire, Shift to boost, `Esc` or `P` to pause. The sun/moon button at the top right switches light and dark mode.

## Development shortcuts
`dev.js` adds testing shortcuts, all behind one flag. Press `` ` `` (or click DEV in the corner) for the list with live stats. They use Option (Alt) plus a key:

- Anywhere: `⌥[` / `⌥]` slow down or speed up time (¼× to 8×), `⌥0` resets time and the clock.
- Orbit: `⌥1`–`⌥5` land Starship on that page, `⌥F` launches Flight straight into play, `⌥H` moves the sun three hours on (`⌥⇧H` back to the real clock).
- Flight: `⌥1`–`⌥5` fly toward that world, `⌥N` arrive now, `⌥L` arrive and land, `⌥G` invincible, `⌥R` rock on a collision course (`⌥⇧R` big), `⌥E` drone, `⌥I` ring, `⌥U` refill, `⌥X` game over.

Turn it off before shipping: set `DEV=false` at the top of `dev.js`, or delete its `<script>` line in `index.html`. `?dev=0` or `?dev=1` in the URL overrides the flag for one visit.

## Verify
Run `node --test tests/scene.test.cjs tests/flight.test.cjs tests/dev.test.cjs` from this folder. Regression checks cover the full-flight engine flame, stable orbit radius, viewport containment during navigation/rotation/zoom, label overlap, landing and sky navigation, return to orbit, reduced motion, full-width terrain, and terrain cache invalidation, launching Flight from the ship, landing and takeoff after "Land here" (a dry pad on every world), and the game itself (camera intro, a lane that grows with the screen, collision marking, lasers, rock splitting, collisions and grace, rings and repairs, arrival and landing, drones, and finite drawing at phone and desktop sizes).

The Ask Joey tests cover question normalising, intent, that paraphrases reach the same fact, that every fact is reachable, that an unanswered fact is admitted rather than invented, that suggestions only offer answerable questions, that off-topic questions and commands are declined, and that follow-ups carry context.
