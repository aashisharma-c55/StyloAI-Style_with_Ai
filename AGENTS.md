<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md
- App pages live under `src/routes/_authenticated/` (client-only guard, ssr: false) — sessions live in browser storage.
- Browser reads/writes use the Supabase client with RLS; server functions only for AI, weather, device registration and simulation.
- ESP32 hardware calls `/api/public/device/*` authenticated by per-device keys (only SHA-256 hash stored) — separate from user auth.
- Simulated scans/readings carry `is_simulated = true` and are never mixed with hardware data in the UI.
- `src/lib/recommend.ts` is the pure rule-based engine and the fallback when AI fails; AI item IDs are always validated against the user's wardrobe.
- Weather uses Open-Meteo (keyless) via a server function.
