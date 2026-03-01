# Summit Registry

Your climbing logbook.

## Files

- `src/supabase.js` — Supabase connection
- `src/index.js` — Auth wrapper (handles login state)
- `src/AuthScreen.js` — Magic link login screen
- `src/App.js` — Main app

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → New Project → import your GitHub repo
3. Vercel will auto-detect it as a React app — just hit Deploy
4. Once deployed, go to your Supabase project → Authentication → URL Configuration
   and add your Vercel URL to "Redirect URLs" (e.g. https://summit-registry.vercel.app)

## Add to iPhone home screen

1. Open your Vercel URL in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. Done — it opens fullscreen like a native app
