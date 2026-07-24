# ATELIER.

Your room, on your own URL. YouTube plays here.

## One-time setup (~15 minutes)

1. **New Firebase project.** console.firebase.google.com → Add project → name it
   `atelier` (or anything). Do NOT reuse the Clique projects — clean separation,
   and Hosting on the free Spark plan costs nothing. You don't need Firestore,
   Auth, or billing for this version.

2. **Point this folder at it.** Open `.firebaserc` and replace
   `REPLACE-WITH-YOUR-ATELIER-PROJECT-ID` with your new project's ID
   (shown in Firebase console → Project settings).

3. **Install + run locally:**
   ```
   npm install
   npm run dev
   ```
   Opens at http://localhost:5173 — full Atelier, YouTube working.

4. **Deploy:**
   ```
   npm install -g firebase-tools   # if you don't have it
   firebase login
   npm run build
   firebase deploy
   ```
   Live at `https://<project-id>.web.app`. Free.

5. **Claude features (COUNT IT / RIFF / READ THE WEEK).**
   Get an API key at console.anthropic.com → API keys. In Atelier, click
   `⚿ claude api key` in the sidebar and paste it. The key lives ONLY in your
   browser's localStorage — it is never in the code or on the server.
   Personal daily use costs a few rupees a month.
   (If you share the site link with friends, they paste their own key —
   or skip it; everything except the three AI features works without one.)

## Iterating

Everything is one file: `src/App.jsx`. Change → `npm run dev` to preview →
`npm run build && firebase deploy` to ship. Best worked on with Claude Code
pointed at this folder.

## Notes

- Data is per-browser (localStorage). Phone and laptop are separate rooms
  for now. When you want sync + accounts, the upgrade path is Firebase
  Auth + Firestore in this same project — ask Claude Code for it.
- A few YouTube uploads disable embedding everywhere (uploader's choice);
  playlists and most mixes play fine on your own origin.
- Custom domain: Firebase console → Hosting → Add custom domain, and point
  umangbhavar.com (or a subdomain like atelier.umangbhavar.com) at it.
