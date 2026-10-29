# Wedding gallery QA

final result: passed

## Scope and source of truth

- Structural reference: the user's latest inline gallery image (1024 × 886), used for the three-column/two-row arrangement and more-cell pattern only.
- Style reference: the existing invitation. The user explicitly prioritized its ivory/brown colors, fonts, wording, decorations, gallery width, and section spacing.
- Confirmed dimensions: 8px gaps, 10px corner radius, 3:4 thumbnail ratio.
- Data constraint: there is one real wedding photograph. It is displayed once. Five additional real photographs are needed to populate six cells; none were copied or generated for production.
- More behavior: five ordinary thumbnails and a sixth, brown-overlay cell when there are at least six photographs. The count is total minus five; the sixth cell opens photo index 5 and the popup includes the complete list.

## Browser-rendered evidence

Evidence is local to the Codex verification workspace; it is not deployed with the invitation.

- Existing style screenshot: `/workspace/wedding-mobile-verification/390/section-6-inv-gallery.png`.
- Current production screenshot: `/workspace/wedding-gallery-redesign-verification/production-1-390/gallery.png`.
- Isolated seven-item test screenshot: `/workspace/wedding-gallery-redesign-verification/test-cards-7-390/gallery.png`.
- Combined before/current/test comparison: `/workspace/wedding-gallery-redesign-verification/design-comparison.png`.
- Focused popup evidence: `/workspace/wedding-gallery-redesign-verification/production-1-390/popup.png`.
- Corresponding 320px captures and Playwright traces are stored alongside these files.

Viewports were 320 × 780 and 390 × 780 CSS px, DPR 2. Section screenshots at 390px are 780 × 1286 physical pixels; the combined style comparison downsamples each to 390 × 643 and aligns them with labeled headers. It is a comparison of the actual invitation style, its real one-photo state, and the conditional structure under test. It is not a claim that test cards are wedding photos or that the production site currently has six photographs.

The user's inline reference has different photography and serif overlay lettering. Those are intentionally not copied: the user required existing photos and fonts. Its structure is validated by measured grid tracks, cell ratios and spacing. The combined comparison evaluates the retained invitation styling. The more overlay was also inspected at its own thumbnail scale, and the popup was reviewed separately to check the actual photograph's loading and proportions.

## Required fidelity surfaces

- Typography: existing Designhouse headings and Pretendard text remain unchanged. More text inherits the current font and uses ivory text; no new font or icon assets were introduced.
- Spacing and layout: three columns at both widths, 8px row/column gaps, 10px corners and 3:4 cells. Existing gallery width, heading, description, top/bottom padding, minimum height and decorative border are retained.
- Colors: original ivory background and brown text remain. More uses `rgba(96, 78, 77, 0.66)`, derived from the invitation's existing brown, with `var(--inv-paper)` text.
- Image quality: the original JPEG is retained byte-for-byte. Thumbnails use cover without stretching; the popup retains its existing contain sizing. Synthetic cards are used only in an isolated test build outside the repository.
- Content: all existing section text is retained. Production renders one real photo and no fabricated more count. Test-only seven-item data produces +2 MORE and opens 6 / 7; unit tests cover six-item +1 and additional counts.

## Findings and comparison history

1. [P1, fixed] During implementation, absolute photo-list paths were prefixed twice in client-side Pages popup URLs. The photo list now uses paths relative to public/, and the base path is added once. The final browser checks require every popup image to load with a positive natural width and reject local HTTP errors and duplicated base paths. Both actual-photo and test-data runs pass.
2. The user changed the initial 2px/20px styling preference to confirmed 8px/10px and a brown overlay. The final captures and tests use the confirmed values; the earlier captures are not the final design verdict.
3. No remaining actionable P0/P1/P2 visual or interaction findings within the requested scope.

## Verification

- Real production data: one photo, at 320px and 390px; correct thumbnail/popup, 1 / 1 navigation, gestures, close/focus/scroll restoration and BGM continuity.
- Isolated seven-item data: 3 × 2 preview, +2 MORE, all first five thumbnail entry points, full visible more-cell hit area, start at 6 / 7, all seven loaded images in order and both wrap directions.
- Center/near-image-edge horizontal swipes, vertical/diagonal non-swipes and taps preserve the existing gesture handling and stay on the page.
- No horizontal page overflow, image load failures, local HTTP failures or browser page exceptions in final runs.
- Eight non-gallery sections retain their rendered markup; CSS outside the gallery grid/overlay block is unchanged.
- Pages build, default Next.js build, TypeScript, lint with zero warnings and all eight automated tests pass.

## Residual limits

There are not enough actual photos to show the six-cell/more state on the production site; that state was browser-tested with isolated, clearly labeled test cards that never enter the repository or deployment. Real iOS Safari/system-edge gestures and direct access to the production Pages origin remain outside this Chromium/local-output verification.

## Implementation checklist

- [x] Preserve existing styling and all unrelated sections/assets.
- [x] Render only real unique photos in production.
- [x] Match confirmed three-column geometry and more overlay behavior.
- [x] Test all entry points, image loads, navigation, gestures and state restoration.
- [x] Recheck the path fix and final visual captures.
