# Hosted recommendations and Reading DNA evaluation — 17 October 2026

## Method and limits

Used the existing disposable test reader, starting with an empty Library and recommendation history. Requests went through Vela's production API at `127.0.0.1:3105` with real hosted Supabase, Google Books and Gemini. No service-role credentials, simulated provider results, reader reset, personal-account writes or password changes were used. Two catalogue books were finished and rated only in this disposable Library. Its records remain available for inspection.

The evidence separates HTTP success, catalogue identity, cover availability, relevance, explanation quality, stored feedback and permitted model context. Generated Strong/Good/Experimental labels are model opinions, **not accuracy measurements**. This small exploratory set is not a representative benchmark or an independent reader study. Changing titles between nondeterministic runs does not by itself prove a causal improvement in relevance.

Sanitized requests, returned books/reasons, catalogue checks, structured context, immediate DNA evidence and before/after correction records: [hosted evidence](evidence/recommendation-hosted-2026-10-17.json). Credentials and inbox addresses are excluded. This evaluation tests API/backend behaviour; it is not a new visual/browser-device audit or a production-domain smoke test.

## Documented request set

| Case | Request / controls | Initial observation |
| --- | --- | --- |
| Specific book | “Recommend books like Piranesi by Susanna Clarke. Do not include Piranesi itself.” | Returned The Starless Sea, The Ocean at the End of the Lane and If on a Winter's Night a Traveller. All three IDs, titles/authors and volume-bound cover URLs matched Google Books; all covers returned images. Reasons described thematic similarities and differences. Calvino is an experimental thematic comparison rather than a close plot match. |
| Genre/mood | Hopeful adult fantasy about friendship/found family; Fantasy + Hopeful filters | Initially no-match despite suitable real novels. Retrieval bug [REC-01](#rec-01-generic-catalogue-genres-discard-suitable-books). |
| Exclusions | Standalone atmospheric adult mystery; no romance, horror, sequels or study guides | IDs were real, but Moonflower Murders was called standalone without supporting catalogue evidence; one edition had no cover. Relevance/exclusion acceptance failed: [REC-02](#rec-02-exclusions-and-reading-order-need-stronger-verification). |
| Sparse DNA | Clever standalone mystery; explicitly explain uncertainty due to little taste data | Returned Magpie Murders, The Puzzle Killer and A Puzzle For Fools with no invented personal signals. Limited-data caveats appeared, but standalone claims still require the REC-02 follow-up. |
| Permitted baseline | Hopeful fantasy with found family, using only permitted preferences | Hosted session saved matched structured signal IDs. One run returned a novel/adaptation/boxed-set cluster: diversity failed, [REC-03](#rec-03-edition-and-bundle-diversity). |
| Personalisation off | Standalone atmospheric mystery, using only the request | Structured context had no signals, approved activity or controls. Initial generation timed out with honest 503, not fabricated recommendations: [REC-04](#rec-04-provider-timeouts-and-limited-result-pools). Later retry recorded separately. |

Final-build repeats use the evidence names `genre-and-mood-final`, `explicit-exclusions-final` and `personalisation-off-retry`. Earlier failed/no-match responses remain in the evidence rather than being overwritten by later successes.

**Final observed results:** 15 hosted requests produced 11 saved sessions, three no-match responses and one 503 timeout. All 33 returned book entries matched Google Books IDs/titles/authors; 32 supplied volume-bound image URLs that returned images, and one initial entry had no cover. These counts are identity/availability checks, not 33 accurate recommendations. The final genre run returned The House in the Cerulean Sea, Legends & Lattes and Somewhere Beyond the Sea: three distinct works, with the sequel disclosed. The final exclusion run returned Magpie Murders, In the Woods and Bodies from the Library 5; the series/collection choices and unverified content exclusions keep REC-02 open. The personalisation-off retry returned three catalogue-verified books after the earlier timeout.

## Automatic DNA and consent

1. Enabled ratings/history learning and explicitly selected Fantasy, Found family and Hopeful. DNF learning stayed denied.
2. Added Piranesi through the catalogue-backed Library API, then finished it with start/end dates, five stars, Atmosphere feedback and per-book learning enabled.
3. Read hosted signal rows immediately after the finish, **before** calling the DNA refresh endpoint. New active evidence already referenced this reader's saved book. The DNA API displayed that book's evidence and recommendation context included its approved rating/completed status. No reset or manual signal insert occurred.
4. Finished/rated a second real book with per-book learning off. Its title/evidence was absent from approved activity and effective signals.
5. Denied account-level rating/history permissions. Approved activity became empty and learned rating/history/DNF signals were excluded; explicit setup choices remained permitted. Re-enabling allowed learning restored eligible evidence.

These checks establish immediate finish/rating evidence and effective consent filtering in the hosted project. They do not establish that every possible browser cache or device refresh path has been exercised.

## Feedback and later influence

| Action | Hosted storage and subsequent behaviour |
| --- | --- |
| Helpful | Saved `feedback=helpful`; full structured signal rows unchanged. |
| Not for me | Saved rejection and the explicit reason; full structured signal rows unchanged. |
| Show less like this | Saved `preference_effect=show_less` without mutating DNA signal rows. A subsequent live session excluded that volume. This is a future recommendation preference, not deletion of reading history or a promise to exclude an entire genre. |
| Doesn't feel like me → Reduce | Corrected the matched Found family signal: weight **0.5 → 0.25**, influence `reduced`, still active. Retrying kept 0.25. A later hosted recommendation context carried the reduced weight/control; its explanation acknowledged the lower influence. |
| Keep | Saved the correction action and retained the intended active signal. Keep does not necessarily restore an earlier higher weight. |
| Remove | Saved the target signal ID/action, set it inactive and influence `stopped`. Later context excluded it from signals and retained the explicit Stop control. A further live session completed with that context. |
| Personalisation off | Effective signals, activity and Stop/Reduce controls all empty. Saved learning data was not treated as permission to use it. |

The backend sends these structured weights/controls into planning and ranking. This is evidence that later runs use updated permitted inputs; it is not a quantified claim about the subjective quality of their output. Explicit requests continue to take priority over past preferences.

## Linked bugs

### REC-01: Generic catalogue genres discard suitable books

Search commonly labels actual fantasy novels only “Fiction.” Previously, strict genre filtering ran before volume-detail enrichment, leaving bibliographies/reference works or too few usable novels. Resolve leading catalogue volumes first, preserve an available cover when details omit it, allow explicit genre language in descriptions, broaden thin pools and request three complementary seed leads. A regression reproduces generic search genres with detailed Fantasy metadata. Final hosted repeats are retained in the evidence. The three-result contract can still honestly return no-match when fewer than three supported works remain.

### REC-02: Exclusions and reading order need stronger verification

**Open; partially mitigated.** A real ID does not prove content exclusions. The initial run asserted no romance/horror and standalone status without sufficient evidence. Updated ranking instructions prohibit treating missing metadata as proof of absence and require uncertainty about content/reading order. A later run still selected an entry described as part of a series. Prompt changes alone do not guarantee compliance. Before claiming reliable strict exclusions, add structured series/content verification or return an explicit insufficient-evidence result. Do not count HTTP 200 or generated confidence as passing this acceptance criterion.

### REC-03: Edition and bundle diversity

Work grouping missed “Legends & Lattes” versus “Legends and Lattes: Book 1”; a boxed set also filled a slot. Normalize ampersands, numbered-edition suffixes and author initials; exclude boxed sets/omnibus editions unless requested. Candidate filtering and final output validation share the work key. Regression checks ensure these editions collapse to one work. Richer adaptations, translations and unlabelled bundles may still require catalogue identifiers beyond title/author normalization.

### REC-04: Provider timeouts and limited result pools

**Open external-service limitation.** A personalisation-off generation timed out and returned 503. Catalogue probes also encountered transient Google Books 503s. Record retry outcomes separately; preserve input and do not fill slots with invented or weak matches. No quota/billing changes were made. Broad requests may still return experimental or insufficient matches, particularly with the current exactly-three-results contract.

## Regression checks

The final suite passed **51 tests**, including **122 PostgreSQL privacy assertions**. Lint and production build passed. New tests exercise pre-filter metadata enrichment, available-cover preservation, edition grouping and explicit genre descriptions. Historical 49-test results remain dated historical evidence. Fourteen hosted storage/consent assertions passed; request outcomes and relevance failures are counted separately above.

The dates in the October plan remain planning targets; this evaluation creates no new official deadline. Recommendation-quality acceptance remains conditional on REC-02 and provider/metadata limitations, while the documented hosted DNA and feedback checks passed.
