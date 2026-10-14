# Responsive verification — 14 October 2026

The main app screens now expand beyond the former 480px phone limit. Mobile keeps the existing visual treatment; tablet/desktop use wider content, two-column Home cards, paired Library shelves, three recommendation cards when space allows, and a two-column Settings overview. Book covers keep portrait proportions. Entry/setup forms remain centred at readable widths, and desktop navigation has larger labels/targets.

## Browser evidence

132 isolated Chromium checks passed with no browser errors. Real application components used simulated reader/API records; no hosted account, Library or password was changed.

- Main screen widths: **320, 390, 393, 428, 768, 1024, 1440 and 1920px**. Home, Library, Add Book, Book Detail, Discover, DNA, Stats, Settings, Current Reading, Graveyard and setup showed no horizontal page overflow.
- Welcome/login/signup/forgot-password checked at 320, 390, 768 and 1440px.
- Larger-text setting checked across seven core screens at 320px.
- Progress dialogs checked at 320×568, 844×390 and 1440×650, including reachable actions, retained edits and discard confirmation.
- Shelf/grid view, profile forms, setup preferences, Finish/DNF sheets and recommendation results/detail checked at mobile, short landscape and desktop sizes.
- Screenshots of mobile/desktop layouts reviewed; desktop Home spacing and cover distortion corrected during the review.

The temporary preview route was removed before the production build. These checks verify browser layout and existing frontend interactions, not physical-device Safari behaviour, a complete contrast audit or live recommendation relevance. Those remain part of the final cross-browser/accessibility and provider checks.

Sanitized layout results: [responsive evidence](evidence/responsive-verification-2026-10-14.json).

## Final build checks

Lint and the production build passed on 14 October; 36 generated pages exclude the preview route. An additional **24 live production screen checks** passed at 320, 390, 768 and 1440px using the disposable account. Desktop core screens measured 960–1120px rather than 480px, the removed preview returned 404, the Library was preserved and logout succeeded. No browser errors occurred. See [production evidence](evidence/responsive-production-2026-10-14.json).

The existing 49-test suite result remains dated 13 October. This styling change was verified with browser checks and a fresh lint/build; the browser check counts are separate from the unit/database suite.
