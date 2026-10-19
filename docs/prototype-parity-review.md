# Prototype parity review — 19 October 2026

Reference: [Vela prototype, page 1:10](https://www.figma.com/design/KUdyt409wRaPTCSRdfeEH5/Vela?node-id=1-10). Figma was inspected read-only. This supplements the earlier [Final UI state audit](final-ui-state-audit.md), whose 49-test count is historical.

## Reference and changes

Inspected the page inventory of 253 frames and 971 prototype navigation actions across A–K, M–Q. Twenty representative frames were also inspected with design context and screenshots: splash, welcome, signup, login, setup intro/genres, Home, Library, Add Book, Book Detail, Current Reading, progress, finish, DNF, Discover, recommendation list/detail, Reading DNA, Settings and Stats.

- Removed the approximately 60-pixel mock iPhone status-bar space. Actual browser safe-area insets remain respected. Removed the mock home-indicator gap from navigation and sheets.
- Replaced the older gradient, arches, pools and brass rules with the prototype's parchment canvas and two-pixel book edge, shared across screens. Dark mode continues to use its own surface tokens.
- Matched the current logo exports, outlined circular Back controls, Settings icons, rating stars and mobile navigation labels. Local SVGs are used; runtime Figma asset URLs are not shipped.
- Matched Home/Stats metric colors, Reading DNA signal colors and the green recommendation cards with light text. Removed the extra Home reading shortcut between the current-book card and Discover CTA; Current Reading remains accessible from Library's Reading tab.
- Corrected setup intro heading alignment and preference checkbox outlines. Expanded setup options and CSV import remain available as previously requested.
- Matched progress Pages/Percent selection, outlined Cancel and the always-visible private note. Progress uses the same editor from Home, Book Detail and Current Reading. Finish/DNF keep optional dates and notes in More details, with explicit learning explanations.
- Removed blank authentication helper rows that made the form cards taller than the reference. Login does not display signup password-length guidance. Singular result/rating labels use the correct wording.

## Deliberate web adaptations

Presentation keyboards, iPhone status bars and home indicators are excluded. Native input focus and the device's own keyboard handle text entry. Desktop retains the persistent sidebar and responsive columns instead of stretching a phone frame.

Sample names, books, covers, dates and counts are replaced by the signed-in reader's actual data. Recommendation labels remain interpretations, not measured accuracy. Missing metadata and unavailable services retain honest recovery states.

Prototype state frames are conditional UI states rather than separate steps or duplicate routes. The existing simplified save/Undo flow remains intact. Back and Cancel return to the relevant context and protect dirty inputs; a prototype destination that would lose edits or show another sample book is not copied literally. The overlapping absolute-positioned Start reading button in the F01 reference is not reproduced.

## Verification

- **57 functional tests pass**, including authentication, reading transitions, recommendation feedback/corrections, automatic permitted DNA updates, outage/quota policy, CSV, reset/deletion and privacy. The PostgreSQL suites verify 122 baseline RLS assertions and 142 full-schema privacy assertions.
- **45 responsive browser checks pass**: Home, Library, Add Book, Book Detail, Discover, Reading DNA, Stats, Settings and Current Reading at widths 320, 390, 768, 1024 and 1440. No horizontal document overflow; one visible primary navigation; desktop sidebar retained.
- Browser checks also cover setup navigation, signup/login composition, invalid-email presentation, shared progress entry, dirty Cancel → Keep editing, retained page/note edits, discard, finish sheet, recommendation list → detail → explanation, feedback sheet and visible desktop navigation alongside dialogs.
- Existing signed-in Home and Library successfully loaded live Supabase data. A real loaded Google Books cover opened the matching Book Detail, including progress, description and supported book attributes. The live Home progress editor was opened and cancelled without saving.
- Layout/transition fixtures use isolated preview data, not a recommendation-accuracy evaluation. No account or Library mutations were made against the live reader during this review. The temporary preview route was removed before the final production build.
- Preview captures and detailed responsive measurements are local ignored artifacts in `.temp/prototype-parity/`.
- **Lint passes. Production build passes** (36 generated pages); the resulting route list contains no `/design-review` fixture route.

The structural prototype review covers all sections; visual browser checks cover the representative screens and transitions listed above. This is not a claim that every one of the 253 conditional frames has a separate pixel-diff test.
