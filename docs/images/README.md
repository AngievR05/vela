# Documentation images

These files are local repository assets, so the documentation does not depend on expiring Figma download URLs or private local `.temp` paths.

The README's cover and wireframe gallery use **original Figma exports** in [`figma/`](figma/README.md). That manifest records all 19 frame IDs. The browser captures below remain separate implementation evidence; Figma exports are not presented as running-app screenshots.

| Asset | Source / date | Meaning |
| --- | --- | --- |
| `recommendation-desktop.png` | Actual local Vela browser capture, 21 October 2026, 1440px viewport | Updated Explore explanation with the selected Google Books cover, facts, permitted DNA and persistent sidebar |
| `recommendation-mobile.png` | Actual local Vela browser capture, 21 October 2026, 390px viewport | Explore detail with save/feedback and bottom navigation |
| `architecture.svg` | Repository-authored vector diagram, 21 October 2026 | Runtime/services, session/data boundaries and provider payload rules |

The screenshots were visually inspected before copying from the earlier prototype verification artifacts. They contain no email, password, API key or auth callback token. Book titles/covers and displayed evidence are illustrative runtime results, not objective recommendation-accuracy evidence. Google Books supplied the displayed cover; rights in book artwork remain with its rights holders. The small Next.js development badge appears only in development captures, not the production UI.

Use the actual app for new screenshots; do not substitute a Figma screen export as implementation evidence. Keep future captures free of secrets/private notes. This documentation task did not change Figma, account settings, Library data or release tags.
