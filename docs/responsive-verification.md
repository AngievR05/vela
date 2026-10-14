# Responsive verification — 14 October 2026

The app now uses distinct mobile and desktop layouts. Phones keep bottom navigation and touch-friendly sheets; desktop (1024px and wider) has branded side navigation, a clear content viewport and centred dialogs. Home balances current reading with Discover; Library has compact tools, paired shelves and a flexible grid; Book Detail uses a cover/metadata column beside reading controls and descriptions. Settings and recommendations adapt their columns to available space. Book covers keep portrait proportions, and entry/setup forms stay at readable widths.

## Browser evidence

157 isolated Chromium checks passed with no browser errors after the full desktop refinement. Real application components used simulated reader/API records; no hosted account, Library or password was changed.

- Main screen widths: **320, 390, 393, 428, 768, 1024, 1440 and 1920px**. Home, Library, Add Book, Book Detail, Discover, DNA, Stats, Settings, Current Reading, Graveyard and setup showed no horizontal page overflow.
- Welcome/login/signup/forgot-password checked at 320, 390, 768 and 1440px.
- Larger-text setting checked across seven core screens at 320px.
- Progress dialogs checked at 320×568, 844×390 and 1440×650, including reachable actions, retained edits and discard confirmation.
- Shelf/grid view, profile forms, setup preferences, Finish/DNF sheets and recommendation results/detail checked at mobile, short landscape and desktop sizes.
- Screenshots of mobile/desktop layouts reviewed; desktop Home spacing and cover distortion corrected during the review.
- Mobile bottom navigation and the desktop side navigation explicitly checked across breakpoint widths. Desktop empty/cached-recovery and dark-mode states checked; recommendation results also checked at the narrower 1024px desktop width.

The temporary preview route was removed before the production build. These checks verify browser layout and existing frontend interactions, not physical-device Safari behaviour, a complete contrast audit or live recommendation relevance. Those remain part of the final cross-browser/accessibility and provider checks.

Sanitized layout results: [responsive evidence](evidence/responsive-verification-2026-10-14.json).

## Final build checks

Lint and the production build passed on 14 October; 36 generated pages exclude the preview route. An additional **30 live production screen checks** passed at 320, 390, 768, 1024 and 1440px using the disposable account, including explicit desktop-sidebar checks. Desktop core screens measured 960–1120px at 1440px, the removed preview returned 404, the Library was preserved and logout succeeded. No browser errors occurred. See [production evidence](evidence/responsive-production-2026-10-14.json).

Browser check counts are separate from the unit/database suite. The shared-navigation/page-structure refinement passed a fresh **49-test regression run**, including 122 PostgreSQL privacy assertions, lint and the production build on 14 October.
