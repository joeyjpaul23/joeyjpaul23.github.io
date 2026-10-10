# Design system

Read this before adding anything to the site. The goal is that new pages, sections, and features look and feel like they belong to the same site.

## Concept

A quiet, minimalist page built around one idea: **a small solar system you can play with.** The person is the star, and each page is a body in orbit. Navigation is exploration, not a menu. Everything else stays out of the way so the orbit and the text carry the design.

Keywords: minimal, calm, precise, mathematical, alive but never busy.

## Layout

- **One-screen scene.** `html` and `body` are `overflow: hidden`. The orbit stays within the available viewport. A detail section may scroll internally on small or short screens so text remains accessible without pushing the scene off-screen.
- **Two zones.** Text on the left (max width about 30rem), the planetary sky and landscape on the right on wide screens. On narrow screens (under 820px) text sits at the top with the scene below it. Short landscape screens at least 650px wide use the side-by-side layout.
- **Keep the scene visible.** Fit projected orbit rings, belt dots, planets, labels, and the full engine plume inside the available scene area before drawing. Limit zoom to what fits. Shrink immediately when needed and ease expansion. Labels separate vertically when they overlap and remain clickable at their displayed positions.
- **Left margin:** `clamp(1.4rem, 5vw, 4rem)` (the `.pad` class). Every element aligned to the left edge uses it.
- **Home** is the name intro plus a large, centered orbit. **Pages** open the selected planet as a window onto its world (see Motion: Worlds are windows): its circle expands into the landscape's low curved horizon while orbit lines fade out and the other three planets settle into a predominantly open sky. Text appears immediately during the approach.
- **Landscape:** the foreground planet intentionally extends beyond the viewport. Its curve sweeps across the full bottom of the page; never clip it at the text/sky column boundary. Keep the text panel above the foreground, with internal scrolling where needed. The right side has tall ridges and valleys, while the left side falls naturally toward the bottom edge. Starship coasts above the ridges.
- **Terrain depth:** use a perspective height field with directional lighting, shaded triangular faces, softer distant ranges, and foreground rocks with cast shadows. Dragging creates parallax, with nearby terrain moving more than distant ridges. The landscape should occupy a substantial part of the lower view, rather than a narrow decorative strip.
- **Snow:** a climate with a `snow` height gets pale caps on faces above that line, brighter on lit faces. Set the value against the real height field, not by eye. About, Skills and Experience have snow; the arid and dusk climates do not.
- **Climates:** each destination changes the land, not only the paint. About is a high lake with a few trees and one cabin. Projects is two ridges with a dark basin between them, craters, and one dish. Skills is a dry stand of uneven trees. Contact is a lake, two small trees, and one cabin with the site's only warm window. Experience is a snowed-in valley at Christmas: slightly softer relief (`relief`), snow down to the valley floor, a frozen lake, snow-capped pines, a white-roofed cabin, one pine strung with lights, a campfire ringed by seat logs, a small sleigh and two reindeer flying in front of the range, and falling snow. Everything lives right of the text, so the copy stays clear, and it is cached with the terrain. Water never uses the accent color.
- **Lakes:** authored in `climates` in `script.js` as a center, two radii, and a `wobble`. `lakeField` is positive inside the shore; lobes around the angle keep the outline off a plain ellipse. `lakeOutline` walks rays out from the middle so the loop always closes, and the mesh floods a little inside that line so no grid step pokes out past the water. Two things keep a lake in the ground rather than on it, and both are needed. `ridgeHeight` sinks a bowl around the lake, widened by the lake's `basin` multiplier so a small pool can still dish a big hillside. `terrainMesh` then lifts the bank to the waterline in a band outside the shore, so the downhill side cannot fall away below the water. Water is real blue from `naturePalettes`, filled with one vertical gradient (deep far, lighter near) and a darker shoreline stroke. A concentric inner tone reads as a painted ring and a pale outer ring reads as pool coping. Avoid both.
- **Winter props:** a climate with `snowy` caps each pine tier and the cabin roof with snow (lit side bright, shade side blue-gray). A tree entry with a fourth value of `"lit"` is strung with bulbs and a star; they are placed in `paintSurface` (`lights`, `stars`) and drawn in `drawLiveSurface` so the bulbs twinkle out of step. A `frozen` lake reflects at half strength. `snowfall` draws flakes on the scene side only, never over the text, pale with a faint `--dim` rim so they still show on the light sky. Reduced motion freezes all of it.
- **Campfire and sleigh:** `campfire` draws the stone ring, crossed logs and three snow-topped seat logs as a prop; the flames are live: three tongues whose heights come from fast noise so they jump, a soft ground glow, rising sparks, and short bursts of popping sparks so it reads as crackling. `sleigh` is placed over the far range (`lift` sets how high up the mountain face) and drawn live, small, with galloping legs, a gentle bob and a slow drift along the range.
- **The live layer:** water glints and chimney smoke are drawn every frame on top of the cached terrain, not baked into it, so they keep moving while the land stays cached. `paintSurface` leaves `waterSurface` and `chimneys` behind as a plan and `drawLiveSurface` renders them. Anything that must animate on a landscape belongs there. Evenly spaced glints read as pencil lines; jitter them with `terrainNoise`.
- **Reflections:** props standing behind a lake are mirrored into it, squashed, dimmed and clipped to the shoreline. The flip axis is the waterline under the prop, not the prop's own base, so a tree set back from the shore still breaks the surface at the shore. A climate with a lake needs a few trees on the far shore or there is nothing to reflect. Keep them clear of the bank band in `ground()`, or they get culled as standing in the water.
- **Props:** trees, cabins, the dish, and rocks are a few flat facets each, sized by `propScale` so nearer ones are bigger. Terrain lighting comes from the left, so lit faces point left and cast shadows fall to the right. Keep props off the water and off the bank around it. Props take their own real-world color, never the terrain palette, and pass through `aerial()` so distant ones wash toward the same haze the land uses.
- **No navigation bar.** The orbiting labels are the navigation. Keep it that way.

## Color

Defined as CSS variables in `style.css`. Never hard-code colors; use the variables so light and dark mode both work.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f2f4f6` | `#0c0e12` | Page background |
| `--fg` | `#101319` | `#eceff4` | Primary text, orbiting bodies |
| `--dim` | `#586070` | `#98a1b0` | Secondary text, orbit rings, hints |
| `--accent` | `#2a44ff` | `#8a9cff` | The single accent: planet, hover and active states, links |

Rules:
- Keep one accent color for UI, navigation, planets, and the engine flame. The landscape has its own natural palette.
- No gradients, shadows, or decorative fills. Depth comes from the 3D scene, not from styling.
- Starship uses neutral gray `--ship-body`, dark gray `--ship-shield`, and a fine `--ship-edge` highlight. Its engine flame uses the existing accent color with a pale core.
- Terrain palettes are authored in `terrainPalettes` in `script.js`: sage and sandstone for About, terracotta for Projects, teal and slate for Skills, muted violet for Contact, and snow blue-white for Experience. Lighting generates the highlights and shadows from these base colors. Preserve the faceted, three-dimensional appearance.
- **Water and props are not tinted by the terrain palette.** They are authored separately in `naturePalettes`: blue water, green foliage, brown trunks and cabin walls, slate roofs, gray rock and metal, white snow. The land carries the page's identity; a lake still has to look like a lake. Foliage varies by climate (pine for About and Contact, dry olive for Skills). Experience adds `bulbs` and `star` for its lit tree. The Contact window is a warm lamp, not the accent.
- Dark mode runs every terrain and prop color through `lit()`, which dims and cools toward blue. Dimming alone leaves daylight land under a black sky. The lamp in the Contact window keeps its warmth and stays the only warm light in a window. The exceptions are all on Experience: the Christmas tree's bulbs and star, and the campfire. They are small, warm and deliberate, keep their color at any hour, and should not spread to other pages.
- Theme follows the visitor's system setting. The sun/moon button at the top right overrides it by setting `data-theme` on `<html>` and saving the choice to `localStorage`; with nothing saved the system setting wins again. It is the one control outside the orbit, so keep it quiet: no background, no border, `--dim` until hovered.
- Canvas code reads colors from these variables at runtime, so it follows the theme automatically. It re-reads them on both the system change and a `data-theme` change, so the override reaches the scene and not only the CSS.

## Typography

- **Headings and the name:** Instrument Serif, regular weight, tight letter spacing (`-0.01em`). Headlines are large: `h1` up to 5.4rem, `h2` up to 3.6rem.
- **Body and UI text:** Instrument Sans, weight 400 (500 for labels and small headings).
- Fallbacks are always defined (Georgia for serif, system sans for body).
- Secondary text uses `--dim`. Emphasis uses the accent color, not bold or italics.
- Keep copy short. One or two sentences per idea.

## Motion

Motion is what keeps the page from feeling static. It should feel smooth and unhurried.

- **Time of day:** one sun serves the whole site and is placed by the visitor's own clock, so every page agrees on the hour. `computeSun` returns a light vector, a color tint, an exposure, and a shadow direction and length; it is recomputed every ten minutes, which clears the terrain meshes because face lighting is baked into them. Keep it one continuous arc over the day rather than a day/night branch: a branch made 17:59 golden and 18:00 midnight-blue. The visible star arcs east to west to match, and prop shadows fall away from it and stretch as it drops.
- **Time of day is not the theme.** The clock sets the direction and color of the light; the light/dark toggle sets the overall brightness. Keep them independent, so a visitor reading at midnight in light mode gets a moonlit landscape on a light page rather than a broken-looking one.

- **Text entrance:** the `.r` class fades and slides text up with a slight blur. Stagger elements with `style="--i:N"` (each step delays about 90ms). Use the same easing everywhere: `cubic-bezier(.2, .7, .2, 1)`.
- **Scene morphing:** values in the orbit scene ease toward their targets each frame (about 7% per frame). Never jump a value directly. If you slow or speed something up, ease the speed and add it to an angle each frame, do not multiply total elapsed time (that makes objects teleport).
- **Hover:** hovering an orbiting label highlights it in the accent color and slows the whole system.
- **Idle:** the system always rotates slowly, and momentum carries after a drag.
- **Reduced motion:** always respect `prefers-reduced-motion`. Animations turn off and the scene redraws as a still image on interaction. Any new animation needs this fallback.
- **Starship:** cruises near the outer orbit on Home. Selecting a page starts a 2.6-second transfer with a visible engine flame throughout, then the ship coasts above the mountains. Its underlying orbit has a fixed radius of 0.28 scene units, independent of screen size and zoom. New selections redirect it from its current position; Home sends it back to the outer orbit. Its body stays approximately 20–36 CSS pixels long, adjusted slightly for perspective.
- **Landing and takeoff.** After "Land here" in Flight, Starship belly-flops onto that page's world once the approach settles (4.4 seconds, `LAND_TIME`). The position is one cubic Bezier that carries on the way the ship was coasting, swings over the pad and comes straight down, walked by a Hermite curve that eases to rest at touchdown, so nothing hitches. The belly flop lives in the heading and burn, which blend rather than switch: it tips flat, rocks, flips upright as the engines relight, and settles with a small damped wobble. The pad is the flattest dry patch in the open middle foreground right of the text; the search wants it back from the painted shoreline and clear of every prop, and relaxes one wish per pass so every world gets one. `paintSurface` picks it and leaves it in `landingSite`. A contact shadow and dust ride under the ship near the ground. Leaving the page lifts it straight off for 1.3 seconds, then eases it into the usual transfer. Clicking the ship on the ground opens Flight again. Reduced motion lands and leaves at once.
- **Worlds are windows** (`drawWorlds`, the "Worlds as windows" block in `script.js`). Each landscape is a circular window onto its own world, painted once into a cached bitmap (`paintWorld`, three kept) together with its live plan (water, smoke, the landing pad). Every navigation is one continuous move of that window on a critically damped spring (`spring`), so it can be interrupted mid-flight and carries its velocity into the next. **Home → page:** the clicked planet's dot opens as an iris onto its world, which sits in its real place a touch magnified (1.12) and settles to true scale; the dot's own color clears off it as it opens, so the planet you clicked visibly becomes the place (about 1 s, `omega` 5.2). **Page → page:** the destination's dot in the sky opens over the current world with its own sky, while the world being left recedes underneath; there is no trip back out to the orbit (about 0.9 s, 6.2). **Reading:** the same window settles into the corner globe (6.5). **Back to orbit** closes the window into its planet. Window size and content scale interpolate geometrically, so a zoom reads as one even move.
- **Never show a half-built world.** Worlds are only ever drawn finished; there are no flat colored discs or staged reveals during a move. The destination is painted inside the click (or ahead of it, on hover, while the browser is idle), so the frames of the move only place finished pictures.
- **Sky dots glide** to their new places when the arrangement changes, and the world just left fades into its slot in the sky. The sun fades with the reading fold rather than switching off.
- **Terrain performance:** each world's settled landscape is cached at device pixel resolution and reused by every frame, transition and the reading globe. It repaints only when the viewport, theme, sun, terrain camera (drag parallax) or text column changes.
- **Shooting stars:** one subtle background streak 9–17 seconds after arrival, then at randomized 18–34 second intervals. Each crossing lasts 1.35 seconds. Reduced motion parks Starship by its destination and disables shooting stars and engine burns.

## Motion engineering

The rules every animation follows, so the site feels the same on any screen. Check new motion against them.

- **Time, not frames.** Every eased value in the canvas moves by `damp(value, target, rate, dt)` (`1 - e^(-rate*dt)`), never by a fixed fraction per frame. A per-frame constant runs twice as fast on a 120 Hz display and stutters across a dropped frame. Rates are per second: 4.35 for the slow scene settles (scale, fade, reading fold), 7.7 for zoom, 14–16 for hover.
- **Budget.** A 120 Hz frame is 8.3 ms. The scene, every page transition, drag and Flight hold that budget with no long animation frames; a View Transition costs its one snapshot frame and no more. Measure with `requestAnimationFrame` intervals and the Long Animation Frames API, not by eye.
- **Compositor properties only.** CSS motion animates `opacity`, `transform`, `translate`, `scale` and short `filter` blurs, never padding, width or position. Hover nudges use `translate`, not `transform`, because a finished `.r` entrance pins `transform` with its fill and would silently cancel them.
- **Nothing pops.** Hovered planets grow and tint over ~70 ms; labels that bump to clear a neighbour glide to their new line (while never overlapping); labels slide sides around the reading globe; the ship's "Fly" fades in; the scene fades up on first load.
- **Text swaps are View Transitions** (`vt`, `swap` in `script.js`). The leaving block lifts and blurs away from where it stood (280 ms, accelerating); the arriving block rises on its `.r` stagger, held back 160 ms (`vt-arrive`) so the two barely overlap. The page snapshot is never cross-faded, so the canvas runs live underneath, and `::view-transition` ignores the pointer so no click is swallowed. Browsers without the API swap instantly.
- **Theme.** Set in an inline `<head>` script before first paint (no flash of the wrong theme), with `color-scheme` to match. Switching reveals the new theme as a circle from the button (600 ms) over a still of the old one, with transitions held off so it arrives already in its colors.
- **Input.** Dragging follows the pointer 1:1. The release fling is fitted over the last 100 ms of samples, so a pause before letting go does not throw; the coast decays exponentially in time. Wheel deltas are normalized from lines and pages to pixels before they feed the zoom target.
- **Feedback.** Hover effects live under `@media (hover:hover)`, so taps on phones never leave them stuck. Every text button dims the instant it is pressed; the theme button presses in with `scale`.
- **Addresses and keys.** Every page has a hash address (`#projects`), so Back, Forward, the trackpad's swipe back and shared links work; a link opens straight onto its page, settled. ←/→ step through the worlds. Shortcuts never fire while typing in the Ask box or with a modifier held.
- **Fonts.** Preconnected, and backed by fallback faces with measured `size-adjust` ("Instrument Serif Fallback", "Instrument Sans Fallback"), so a first visit does not reflow when the web fonts swap in. Re-measure if the font stack changes.
- **Reduced motion** is followed live in both `script.js` and `game.js`; it parks the scene, skips View Transitions and turns off entrances, hover nudges and the theme reveal.

## The orbit scene (`script.js`)

Drawn on a single canvas with a hand-rolled 3D projection (no libraries).

- Each page is an entry in the `M` array: `{ n: name, r: orbit radius, i: tilt, o: rotation of the tilt, s: speed, a: starting angle }`.
- The order of `M` must match the order of the `<section>` elements inside `#panel` in `index.html`. Index 0 is the first section, and so on. Pages run About, Projects, Experience, Skills, Contact.
- Each `M` entry carries `k`, its art id: the index into `terrainPalettes`, `naturePalettes` and `climates`, and the seed of its terrain noise. Reordering pages never changes `k`, so every landscape keeps its authored shape. A new page takes the next unused art id and appends its art to those three arrays.
- The central planet uses the accent color. Orbit rings and the outer dot belt use `--dim`. Moons use `--fg`, or `--accent` when hovered or active.
- Planets, the sun, and Starship are fully opaque. Bodies, orbit segments, belt dots, and Starship draw from farthest to nearest, so foreground objects cover those behind them. Perspective changes their size; orbit lines and belt dots may remain translucent.
- Interactions: drag to rotate the home orbit (or subtly shift the sky), wheel to zoom the orbit, click a planet or label to open its page. On a landscape, the other three planets remain visible and clickable; the selected planet is the ground. “Back to orbit” restores all four destinations.

## Adding a new page

1. In `index.html`, add a `<section>` inside `#panel`, in the position you want it. Give its heading `class="r"` and its other elements `class="r"` with increasing `--i` values.
2. In `script.js`, add an entry to the `M` array in the same position. Pick a radius that does not collide with the others (current radii are 0.55, 0.78, 1.01, 1.23 and 1.45, with the belt from 1.6; respace them rather than crowd the belt), a different tilt and rotation, and a speed slower for larger radii.
3. Append new pages to the end of `M` (and of the sections) even if the orbit sits further in: terrain is seeded by index, so inserting would reshape every later landscape and break their tuned lakes and snow lines. Add the page's art in the same position in all three per-page arrays: `terrainPalettes` (soil, light, shadow, haze), `naturePalettes` (water, foliage, trunk, wall, roof, rock, snow) and `climates` (lake, trees, cabin, rocks, snow line). Skipping this no longer breaks the scene — `perPage` wraps to an existing entry — but the page will borrow another's look until you author its own. Terrain shape comes from the destination index as a noise seed, so it is new regardless.
4. In the keyboard handler, the number-key check already follows `M.length`; also add the destination to `worlds` in `game.js`.
5. Add a sky position to `spots` in `skyPlanet` for the extra visible destination and check label spacing on mobile. Without one it falls back to a spread position, which works but is not composed.
6. Keep content concise; short screens may scroll within the text panel.

## Sub-pages (Experience)

Experience is the first page with sub-pages. Its section holds a list (`#xp-list`, rows are `.xp` buttons with `data-role`) and one `<article class="sub" id="xp-NAME" hidden>` per role. Clicking a `data-role` element swaps that article in for the list; `data-role=""` returns to the list. Escape closes a sub-page before it leaves the planet, and changing planets always resets to the list.

- A sub-page is: a quiet `← Experience` crumb, the name as `h2`, the position as `.role`, place and dates as `.meta`, then short paragraphs in `.body`, a dim `.tags` line and a `.next` link to the following role.
- Photos use `<figure class="shot">`. Until a real image exists it holds `<div class="ph">`, a faint tone with a thin ridge line. Replace the div with `<img src="…" alt="…">`; it takes the same 3:2 frame. No borders, radii or shadows.
- Long sub-pages scroll inside the panel and fade at the lower edge rather than cutting a line in half.
- **Reading mode.** Opening a role puts `reading` on `<html>`, and `view.read` springs toward 1. The landscape folds into a globe peeking out of the bottom-right corner (`readingGlobe`): a clip circle shrinks from the whole screen onto it while the land scales to 0.8 and slides so the lake sits in the visible part, never so far that the image stops short of the circle. The other pages line up in an even arc around the globe in page order, with labels to the left of their dots, and stay clickable. The sun and Starship are hidden. The sub-page leaves the side panel for a column set in from the left (`min(38rem, 48vw)`; full width above the globe on phones) with slightly larger body text. The section is `position: fixed`, not a resized `#panel`, because the scene measures `#panel` to place the terrain. Closing the role, Escape, or changing planets reverses it.
- Panel sections scroll without a visible scrollbar.
- To add a role: add a list row and a matching article; nothing in `script.js` changes.

## Ask Joey (the About page)

About is the one page laid out as a spread: Joey's own summary on the left, and on the right a
small model that answers questions about him. It reuses the sub-page reading state — `setReading`
in `script.js` puts `spread` on `<html>` beside `reading` — so the landscape folds into its corner
globe and the width goes to the text. Two columns and a globe need room; under 1000px (`SPREAD_MIN`)
neither class is set and About is an ordinary panel page, with the Ask panel below the summary.

- **The globe is smaller in the spread** (`.22` of the width rather than `.36` of the short side)
  and the other planets stack steeply above it with their labels reading outwards, because left is
  now the text column. `spreadEdge()` measures the visible section so a label can never cross it.
  Anything that repositions the sky in reading mode has to respect that edge.
- **The conversation is a printed interview, not a chat.** The question sits above its answer in
  `--dim`, a hairline separates exchanges, and nothing has a bubble, a card or a background. The
  answer arrives with the same `.r` entrance as the rest of the site.
- **Thinking is the one-pixel accent line** the game uses for its route and boost meters, not a
  spinner borrowed from somewhere else. Reduced motion skips it.
- **Suggestions are a promise.** Only questions the model can actually answer are ever offered, so
  a fact Joey has not filled in never appears as a chip. Before the first question they are a list
  and carry the panel; afterwards they shrink to a line of follow-ups under the answer.
- **The left column is a definition list**, meant to be scanned. Below 1200px the rows stack rather
  than wrap into narrow fragments.

### The model (`ask.js`, `profile.js`)

`profile.js` holds **facts, not written answers** — a subject and a set of slots (`value`, `why`,
`when`, `where`, `who`, `how`, `more`, `list`). `ask.js` works out what a question is asking for and
builds a sentence from the slot that fits, so one fact answers "what's your favourite film", "do you
like films", "why that one" and "tell me about films" without any of them being written out.

Four stages: normalise (slang, contractions, a stemmer and a small synonym map collapse the
vocabulary), classify the intent from the question word, retrieve by TF-IDF scored as half cosine
and half coverage plus a phrase bonus, then realise the sentence.

Rules worth keeping:

- **An unanswered fact is reported, never filled in.** `value: ""` means Joey has not written it
  down, and the panel says so and points at his email. This is the feature, not a gap.
- **Never affirm what the facts do not claim.** A yes/no question only gets "Yes" when the thing
  asked about is in the fact's own `value` or `list`, and never for an either/or. Without that check
  the model answered "did you use three js" with "Yes" on a site whose point is that it uses none.
- **`keys` is search vocabulary, weighted above prose.** Write the words a stranger would use. Avoid
  generic ones — "day" in the morning fact hijacked "what are you up to these days" until it went.
- **A one-word question must land on curated vocabulary** or it scores as not understood, or any
  common word confidently matches something.
- **Links name their destination**, `[label](#page:Experience)`, never its index. The page order in
  `M` has changed before and a stale number sends someone to the wrong planet.

To teach it something: add a fact. To change how an answer reads: change the slot, or add a `frame`.

### The optional proxy (`worker/`)

Deploying `worker/joey-ask.js` swaps the phrasing for a hosted model while the parts that keep it
honest stay on the client: retrieval, the unanswered check, and a numeric guard that rejects any
figure the model produced that is not in the facts it was given. An unanswered fact is never sent,
and neither is a fact that is not genuinely in contention — an unrelated one in the context is
something for the model to blend into the answer. Anything slow, failed or ungrounded falls back to
the local answer with no error. Without it the page needs no network, no key and no build step,
which is the property worth protecting.

`PROXY` at the top of `ask.js` is the whole switch. When it is set the panel says so if asked what
it is, because "nothing goes anywhere" stops being true; keep that answer honest. `worker/dev-server.mjs`
runs the real worker locally with a stub model (and `--wrong` / `--slow`) so the failure paths can be
seen, and `tests/ask-remote.test.cjs` holds them.

- **The on-device model** (`ask-llm.js`, `ask-llm-worker.js`). Qwen2.5 0.5B Instruct via WebLLM, offered once in a quiet `.device` line under the description and only where WebGPU works (and not with Save-Data). The download shows as the panel's one-pixel accent line with a percentage; then the line names what is answering. Returning visitors are recognised from the `webllm/model` cache and the model wakes when About opens, unasked. It runs in a worker over http(s) so generation never costs a frame (measured: 0 dropped at 120 Hz).
- **It rewrites, it does not compose.** It gets the retrieved facts plus the locally written answer as a DRAFT. A reply stands only if it passes the hosted model's checks plus `faithful()`: first person, and at most a fifth of its content words (minimum two) new relative to the facts, question and draft. In testing a 0.5B model described the Sinn Fund as "a financial institution… founded by its founder"; that is exactly what this rejects. Replies are shown only after the check (well under a second), never streamed unverified.

## Adding content to an existing page

- Reuse existing patterns: `article` blocks with an `h3` and a `<small>` line for projects, and the `.skl` list for lists of short items.
- Links use the accent color. Do not add buttons with backgrounds or borders.
- A small canvas or diagram is welcome if it is alive (it moves or responds), like the close-approach demo on the Projects page.

## Flight (`game.js`)

Catching Starship in the orbit (click it, or press `F`) opens a small game: ride the ship out through the belt to each page's world. It is the one place the site becomes a game, so it keeps the site's look rather than borrowing one from arcade games.

- **Entry and exit.** The orbit canvas scales into the ship's screen position and fades while the game layer fades in. The game camera starts directly above the ship, matching the top-down silhouette in the orbit, and the intro runs in two calm steps rather than at once: still looking down, the view turns the short way until the nose points up (0.8 s), then the camera swings back into the chase view (from 0.55 s to 1.9 s; `INTRO`, `TURN_END` and `SWING_START` in `game.js`). "Back to orbit" or `Esc` reverses the zoom. The orbit loop stops while the game runs and resumes where it left off.
- **Same 3D, same light.** Hand-rolled projection, flat-shaded meshes, one light from the upper left, a painter's sort. Rocks are perturbed icosahedra in rock gray. Distant things wash toward `--bg`. Natural colors dim and cool in dark mode like the landscapes.
- **Starship flies rolled onto its side.** It holds a steady roll (`SHIP_ROLL`) that turns its tiled belly toward the camera, so the chase view shows the real ship's black-and-steel profile instead of a bare steel top. It banks a little further into turns and yaws the nose slightly; it never pitches.
- **Starship up close.** A 40-sided stainless hull in eight barrel sections of slightly different tone, a tangent-ogive nose, and about 900 black hexagonal heat-shield tiles laid in staggered rows over the windward side: the belly, a little past the flap hinge line, and the whole nose tip. Tiles are inset so the darker steel shows as seams and the shield's edge steps along the hex rows, as on the real ship; a few run lighter, like replaced tiles. Two aft flaps and two smaller forward flaps hinge on the shield line with thin chines between them, steel on top and tiled underneath. About 6:1 like the real ship, in the `--ship-*` tokens. The hull gets a soft specular band so it reads as steel; tiles stay matte. The aft end shows six Raptors: three sea-level engines in the middle and three wider vacuum bells around them, each with a lit lip, a dark bell and a glowing throat. The orbit sprite is the same ship from the side: shaded steel, tiles with a stepped edge, a black tip.
- **Plumes.** One per engine, sampled along its axis, bent by a travelling wave and a little per-frame noise, and drawn in three layers (accent, a pale accent, a near-white core) across all six at once so they merge into one fire. The sea-level cores carry two shock diamonds at full power. Boosting lengthens them and sheds sparks. Reduced motion holds them still.
- **Camera and lane.** The world camera is fixed well behind and above with a long lens, and its tilt is solved per screen so the resting ship sits about seven tenths down. The lane, measured from the screen in `measure()`, lets the middle of the ship reach nearly every edge of the page on any screen size. The ship itself is drawn through its own camera parked in the resting chase position and slid to its true place (`shipView`), so it keeps the same top-down look anywhere; through the world camera it turned side-on near the edges.
- **Reading depth.** Two faint rails and streaming ticks mark a lane on the ship's own altitude. Every rock and drone drops a stem to that plane with a small footprint, so something level with you has almost no stem. Anything whose path crosses the ship's is framed in pulsing `--hostile` brackets, with a red stem.
- **Drones.** Lathed saucers with a glass canopy and a small green alien pilot who faces you and blinks. They fire red bolts with a pale core.
- **One accent, one warning.** Your lasers, the engine flame, the reticle, rings you have flown through, repair cells and the distant sun use `--accent`. Everything hostile uses `--hostile` (red, defined for both themes and used only in Flight): drone fire, the collision brackets, and a drone's rim lights just before it fires, which is its tell.
- **Worlds are the pages.** A run starts at the page after the one Starship left from (About from the home orbit), then flies toward each page in page order (`worlds` must follow `M`), drawn in that page's terrain palette. Contact shows its one warm window on the night side. Arriving pays a bonus and offers "Keep flying" or "Land here", which closes the game, approaches that page in the orbit and lands Starship there (see Motion). The sector list is `worlds` in `game.js`.
- **The loop.** Rocks (big ones take three hits and split), rings (fly through to refill the boost), repair cells (restore one hull), and from the second world on, drones that hold station ahead, weave and fire. Three hull; a hit gives 1.4 seconds of grace. Difficulty rises per sector through `cruise()`, `sectorLength()` and the spawn gaps in `spawn()`. The best score is kept in `localStorage` under `flight-best`.
- **HUD is text.** Score in Instrument Serif at the top right, the destination and a one-pixel progress line at the bottom center, hull as three dots and a boost line at the bottom left. Cards (start, arrival, pause, game over) sit left-aligned at the `.pad` margin like the page panels, with accent text buttons and no backgrounds.
- **Controls.** Arrows or WASD, or the mouse position, steer; Space or the mouse button fires; Shift boosts; `Esc` or `P` pauses. On touch, drag anywhere to steer relative to where the finger landed, holding fires, and a quiet "Boost" button appears at the bottom right.
- **Cost.** One canvas, under a thousand faces a frame (mostly the ship's tiles, half of them culled), no libraries. Things that pass the ship are dropped before they reach the camera. The game pauses when the tab is hidden.
- **Reduced motion.** The zoom and camera swing are skipped, plumes do not wave or spark, stars stay dots instead of streaks, and there is no screen shake.

## Do and don't

Do:
- Keep it sparse. Empty space is part of the design.
- Make new elements respond to the pointer or move subtly.
- Keep typography and UI within the existing system; use neutral spacecraft colors and the destination's natural terrain palette for the illustration.

Don't:
- Add page-level scrolling, modals, cards with shadows, gradients, or extra UI accent colors. Internal scrolling in detail sections is permitted when needed to keep content accessible. Terrain lighting, natural colors, and cast shadows are part of the landscape design.
- Add a visible navigation bar or menu.
- Use bold or all-caps text for emphasis.
- Add heavy libraries. The page should stay light and load fast.

## Accessibility

- Text must keep readable contrast in both themes (`--dim` is the lowest allowed contrast for secondary text).
- The orbit is a canvas, so the number keys (1 to 5) and Escape provide keyboard access. Any new page should be reachable this way.
- Respect reduced motion (see above).
