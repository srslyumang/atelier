# ATELIER — COMPLETE PROJECT BRIEF (handoff for coding agent)

Read this fully before touching code. Atelier is a finished, working v1. Your job is to preserve its character while helping Umang iterate and deploy. The entire app lives in ONE file: `src/App.jsx` (~77KB). Everything below describes what that file already does.

## 1. WHAT THIS IS

Atelier is Umang's personal "default home" — a single-user daily operating room that replaces scattered tracking (calorie chats with GPT, notes apps, Notion) with one curated, art-directed space. It is NOT a generic productivity app. It is a room curated by an artist: something is always in motion, the whole space rearranges daily, and every tracker has a soul. Design references: Basquiat, Joan Miró, Kandinsky, George Condo. The user is a solo founder (built Clique Social, Flutter+Firebase) who trains in the gym, obsessively curates music, and journals/brainstorms daily.

Core philosophy: trackers log, this room REMEMBERS. Simple > complex, but fluid and HELLA COOL. Never make it feel like a corporate dashboard.

## 2. TECH STACK & PROJECT SHAPE

Vite + React 18, plain JS (no TypeScript), no router (tab state), no Tailwind, no UI libs. All styling is a CSS template string (`const CSS`) injected via `<style>{CSS}</style>`. All visuals are hand-written inline SVG. Persistence is `localStorage` (async wrappers `sGet`/`sSet` keep the API future-proof for a Firestore swap). Fonts loaded via Google Fonts `@import` at the top of CSS.

Files: `index.html` (root div, favicon, meta), `src/main.jsx` (mounts `<Atelier/>`), `src/App.jsx` (everything), `vite.config.js`, `firebase.json` (hosting → `dist`, SPA rewrite), `.firebaserc` (placeholder project id `REPLACE-WITH-YOUR-ATELIER-PROJECT-ID`), `README.md` (deploy steps).

Scripts: `npm run dev` (localhost:5173), `npm run build`, `firebase deploy` after build. Build is verified clean.

## 3. DESIGN SYSTEM (do not violate)

Dark theme is DEFAULT. CSS variables on `.room.dark` / `.room.light`:
- dark: `--bg:#14120C` (warm near-black), `--fg:#EFE8D8` (bone), `--line:#EFE8D8`, dotted grid background `radial-gradient(rgba(239,232,216,.14) 1px, transparent 1px)` at 26px
- light: bone bg `#EFE8D8`, ink fg `#16120C`, dots `#E0D5BC`
- accents (const ACC): red `#E8402A`, blue `#3B5BE8`, sun `#F0B41C`, moss `#2E8A5C`, iron `#A8A196`

Typography: Syne 700/800 for display/headlines (tight letter-spacing, lowercase-line-height .9), Space Grotesk for body, Space Mono for labels/data/eyebrows (letter-spaced smallcaps feel), Fraunces serif for all writing surfaces (studio, journal, letters).

Visual language: neo-brutalist — 3px solid borders, hard offset shadows (`box-shadow: 5px 5px 0 var(--line)`) that grow on hover with a -2px translate, no border-radius anywhere except dots, dashed 2px dividers on lists. In dark mode the shadows are LIGHT (bone) — keep that, it's signature. Buttons are `.act` (mono, letterspaced, colored fills) or `.ghost` (underlined mono). Chips are `.chip` bordered mono pills.

Theme toggle: ☾/☀ button in rail, persisted in settings.theme.

## 4. LAYOUT

Desktop: fixed left rail 200px (sticky, full height, 3px right border) containing: ATELIER. wordmark (red dot, click → today), vertical nav with color swatches, `⚿ claude api key` ghost button (pushed to bottom via margin-top:auto), and the Sisyphus animation pinned at the very bottom. Main canvas max-width 1060px, padding 46/56, bottom padding 130px so the corner player never covers content.

Mobile (<760px): rail becomes horizontal scrollable top bar, Sisyphus hidden, creatures left-aligned, month grid fluid, mini player full-width bottom.

## 5. AMBIENT SYSTEMS (the soul — protect these)

Seeded PRNG: `rng(seed)` — FNV-1a hash + mulberry32. Everything "daily" derives from `dkey()` = local YYYY-MM-DD.

DAILY MARKS (`<DailyMarks seed={today}>`): 4–6 Miró-style shapes (filled dot, ring, crescent, scrawled asterisk star, triangle outline, rotated square) scattered at fixed screen positions chosen from 6 safe edge zones — shape, color, size, position, and whether each drifts (slow 12–24s float) are all seeded by the DATE. The whole room rearranges at midnight. Fixed position, pointer-events none, z-index 0.

DAILY CANVAS (`<DailyCanvas seed wide?>`): a generative one-of-one abstract composition per date — big filled circle, crescent, scrawled star, triangle, 1–3 wandering quadratic ink lines, 3–9 dots, on a bordered `--soft` panel. Wide variant (760×150) is the banner at the top of TODAY; square-ish (260×180) used in the ritual; 72px thumbnails in Atlas record rows for sealed days. Same date always renders the same painting — that's the archival trick (no image storage needed).

MOON: real lunar phase computed from synodic month (known new moon epoch 2000-01-06 18:14 UTC), rendered as an SVG two-circle mask with the phase name ("waxing gibbous"), shown in TODAY's eyebrow.

CREATURES (one per room, all inline SVG + CSS keyframes, all honor prefers-reduced-motion):
- Sisyphus (rail, all pages): stick figure pushing a boulder up a 3px slope toward a red flag; climbs 16s linear, stumbles, resets. Caption: "one must imagine him shipping".
- Flame (FUEL): grows with kcal progress (`scaleY .45→1.2`), inner sun tongue, organic skew flicker. Caption "{pct}% stoked".
- Marble + chisel (TASKS): block with 7 blue-outlined corner chips; each chip falls away (translate+rotate+fade) as TODAY's completion fraction passes its threshold; when all of today's tasks are done a stick figure fades in inside the stone ("the figure emerges"). A small gold-handled chisel taps at the block every 3s forever.
- Vinyl (SOUND): record with grooves + sun label; spins 2.4s linear ONLY while something is playing; tonearm rotates down onto the disc when playback starts. Caption "now spinning"/"needle up".
- Barbell (IRON): bar bends (quadratic path) proportional to sessions this week, gentle 5s heft bob. Caption "N sessions this week — the bar remembers".
- Pyramid (ATLAS): 10 stones in 4 courses; each stone rises into place with overshoot ease, staggered 0.55s bottom-up, sun dot crowns last; holds; then stones fall away in the same cascade; 18s loop. Caption "built daily · torn down nightly".
- Drift (STUDIO/void/ritual): 3 faint shapes floating 34–42s in the periphery.

Hero reveal: `.hero` paints in via clip-path inset animation on mount.

## 6. PAGES (tab state, NAV order: TODAY FUEL IRON TASKS STUDIO SOUND ATLAS)

TODAY: eyebrow = date · editable city (click → inline input, persisted, currently "Malegaon") · moon widget. Then the wide Daily Canvas banner with caption "today's canvas · {date} · one of one — and the whole room rearranges at midnight". Then REACTIVE HERO — giant Syne two-line status: default "STILL PUSHING." → "PR DAY." (iron.pr) → "REST DAY." (type REST) → "HEAVY DAY." (any session) → "DAY SEALED." (journal sealed). Below: daily quote picked by day-of-month from a 16-quote pool curated to Umang's heroes (Kanye, Virgil, Basquiat, Bourdain, Lao Tzu, Upanishads, Camus, Kandinsky, Miró, Eames, Saint-Exupéry, Durant/Aristotle) — short attributed aphorisms, no external feed. Then 5 tiles (FUEL kcal/goal+bar, IRON type+★PR+note/steps, TASKS open count+next, STUDIO page count+last title, SOUND mix count+last label), each border-colored, clicking navigates. Bottom: SUBTLE end-the-day button — small dashed mono "☾ end the day", 65% opacity, turns solid on hover, moss-colored "day sealed — reopen the journal" once sealed. It must stay quiet; never make it prominent.

FUEL: "What did you eat?" textarea (3 rows) accepts WHOLE MEALS/days ("one scoop whey, 5 almonds + 100g curd, 2 rotis…"). COUNT IT → Claude splits into every item with Indian-portion assumptions appended in the name ("dal tadka (1 katori, ~150g)"), realistic kcal rounded to 10 + protein_g. Each entry row: name, EDITABLE kcal input (truth layer), protein, time, delete. Totals vs editable goals (kcal 2400 / protein 130 default) with big Syne numbers + progress bar. LAST 7 DAYS bar chart with dashed blue goal line, over-goal bars turn sun. Flame creature reflects progress. Enter submits, Shift+Enter newlines.

IRON: "Did you show up?" One chip row: PUSH PULL LEGS UPPER LOWER FULL CARDIO SPORT REST + ★PR toggle (gold when on). One input row: note (flex), steps (110px number), cardio (flex). Week stat row: sessions / total steps (en-IN formatted) / cardio days. SHOW-UP MAP: month grid, green dot = session, gold dot = PR day, dashed circle = rest, red corner triangle = cardio logged, today outlined thicker, hover tooltip with full log. ★ PR WALL: reverse-chrono list of all PR days with type + note. Deliberately lightweight — Hevy owns sets/reps (don't add set tracking). Keep this page uncluttered.

TASKS: "Carve the excess away." Add input, open list with 3px square checkboxes, done section (strikethrough) with clear button. Tasks store `doneAt` (dkey) on completion — this feeds Atlas and the marble. Marble progress = tasksDoneToday / (open + doneToday), resets fresh each morning.

STUDIO: two-column — pages sidebar (NEW PAGE moss button, titles or body-snippet, delete) + editor. Editor is borderless Fraunces serif on the open canvas (title 30px bottom-border only, body 18.5px line-height 1.9, NO ruled lines ever — a lined background broke cursor alignment before and was removed). Placeholder = rotating muse line. Autosaves on every keystroke into notes state. CRITICAL PAST BUG: the editor was once defined as a nested component inside Studio, which remounted per keystroke and dropped focus after each letter — it is now inline JSX; NEVER re-introduce nested component definitions that render inputs. Bottom row: ENTER THE VOID (fullscreen writing — fixed overlay, always-dark, centered 68ch column, live word count, drifting shapes, italic muse footer, Esc exits) and RIFF WITH CLAUDE (sends note body; returns one strongest objection + exactly three concrete next moves, <220 words, no flattery — persona: sharp thinking partner for a solo founder mid-pivot). Riff renders in a moss-bordered box; not saved into the note.

SOUND: "The crate." Paste YouTube URL (video or playlist — `ytId` regex + `list=` param), name it, SAVE + SPIN. Crate list with playlist chip, per-mix `yt` escape link, delete. Playback happens ONLY in the persistent mini player mounted at App root (never inside the tab) so audio survives tab switches: fixed bottom-right 320px card, header bar with 4-bar animated equalizer (all four accent colors), label, ▼ minimize (collapses iframe via height:0 — NOT display:none, audio keeps playing), × close. Playlist URLs load `youtube.com/embed/videoseries?list=` for auto-advance. Known limitation: some uploads disable embedding everywhere (uploader setting) — unavoidable; on own origin most mixes play.

ATLAS: "Zoom out." — the observatory, READ-ONLY aggregation + rituals; never add input forms here. Week stat row: workouts, avg kcal/logged day (vs goal), steps, tasks closed, days sealed X/7. Actions: END THE DAY / REOPEN TODAY'S JOURNAL, and READ THE WEEK → Claude gets a compiled 7-day digest (kcal, iron+PR, steps, cardio, tasks closed, journal excerpts ≤300 chars) and writes a <180-word honest letter — one pattern, one thing to protect, one thing to fix — signed "— the room", rendered in a sun-bordered Fraunces box. THE RECORD: reverse-chrono ledger (≤60 days) of every day that has any data; sealed days get their canvas thumbnail + journal excerpt (≤200 chars, italic serif); chips for kcal (red), session+note (moss, ★ if PR), steps/cardio (iron), tasks ✓n (blue); empty days say "quiet day".

RITUAL (END THE DAY): fullscreen dark overlay (like Void): left = today's canvas + caption "this day's painting — sealed with your words"; right = Fraunces question "How was the day, really?", autofocused serif textarea (placeholder "What happened. What hit. What hurt. What's worth keeping…"), word count, SEAL THE DAY → saves `{journal, sealed:true}` to dayLogs[today]. Esc = "not yet". Reopenable.

## 7. DATA MODEL (localStorage, all JSON via sGet/sSet)

- `atelier-settings`: `{kcalGoal:2400, proteinGoal:130, theme:"dark", city:"Malegaon"}`
- `atelier-fuel`: `{ "YYYY-MM-DD": [{id,name,kcal,protein_g,at}] }`
- `atelier-tasks`: `[{id,text,done,doneAt|null}]`
- `atelier-notes`: `[{id,title,body,updatedAt}]` (newest first)
- `atelier-mixes`: `[{id,vid|null,list|null,url,label}]`
- `atelier-daylogs`: `{ "YYYY-MM-DD": {journal,sealed, legacy: workout/note/highlight} }`
- `atelier-iron`: `{ "YYYY-MM-DD": {type,note,pr,steps,cardio} }`
- `atelier-key`: raw Anthropic API key string (BYOK)

All state loads once on mount (Promise.all), `loaded` flag gates persistence effects (one effect per key). Nested `<DailyCanvas>` etc. are pure functions of seed — no stored images.

## 8. AI INTEGRATION

`askClaude(prompt, maxTokens=1000)` → POST `https://api.anthropic.com/v1/messages`, model `claude-sonnet-4-6`, headers include `x-api-key` from `atelier-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`. Throws `no-key` if unset. Key is entered via the rail's `⚿` button (window.prompt) and never leaves the browser — do NOT move it into code, env at build time, or any server-visible place. All three AI features surface a "check your ⚿ api key" message on failure. `extractJSON(raw)` strips fences and regex-extracts the first `{...}` — keep this; Claude replies sometimes arrive wrapped. Fuel uses maxTokens 1500.

## 9. CURRENT STATE / KNOWN NOTES

Working and verified building: everything above. Known limitations: (1) localStorage = per-browser, no cross-device sync yet; (2) embed-disabled YouTube uploads won't play on any origin; (3) `window.prompt` for key entry is deliberately minimal — a proper settings surface is fair game if it stays in the design language; (4) light theme exists and works but dark is canonical.

## 10. ROADMAP (owner-approved directions, in rough priority)

1. Deploy to Firebase Hosting (new dedicated project, Spark plan, NOT the Clique projects) — README has exact steps. Free `<id>.web.app` URL; custom domain later.
2. Firebase Auth + Firestore swap behind sGet/sSet → cross-device sync, then accounts so friends (e.g. cofounder Aditya) each get their own blank Atelier. This seeds a future "create your account" service.
3. More ambient life (owner loves these — keep fluid + simple): streak garden (a scrawled flower per consecutive logged day), boot sequence (wordmark draws itself, marks fly in), more hero status variants.
4. Weekly letter automation (Sunday nudge), gallery view of all sealed-day canvases.
5. Far future: config-driven modules where AI adds/removes trackers on request.

## 11. RULES FOR THE AGENT

Never flatten the aesthetic into a generic dashboard: no border-radius creep, no gradient buttons, no stock icon packs, no Tailwind rewrite, no template fonts. Every new element uses the existing tokens (vars, ACC, Syne/Grotesk/Mono/Fraunces, 3px borders, offset shadows). New animations must be fluid (eased, staggered, 60fps transforms only) and honor prefers-reduced-motion. Keep copy in the room's voice — lowercase mono captions, dry wit ("the plate is clean", "Sisyphus is jealous"). Don't add input forms to ATLAS. Don't re-nest input-rendering components (focus-loss bug). Don't log or transmit the API key. When splitting App.jsx into modules, preserve behavior exactly and keep the CSS as a single source of truth.
