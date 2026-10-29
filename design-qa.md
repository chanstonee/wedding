# Wedding gallery QA

final result: passed

## Scope and source of truth

- Structural reference: the user's latest inline gallery image (1024 × 886), used for the three-column/two-row arrangement and more-cell pattern only.
- Style reference: the existing invitation. The user explicitly prioritized its ivory/brown colors, fonts, wording, decorations, gallery width, and section spacing.
- Confirmed dimensions: 8px gaps, 10px corner radius, 3:4 thumbnail ratio.
- Current data: the owner's seven uploaded photographs are registered in attachment order as gallery/photo-01.jpg through photo-07.jpg. All seven files match the uploaded originals byte-for-byte; no photos were generated or re-encoded. The original Figma photograph remains in the repository unchanged.
- More behavior: five ordinary thumbnails and a sixth, brown-overlay cell when there are at least six photographs. The count is total minus five; the sixth cell opens photo index 5 and the popup includes the complete list.

## Browser-rendered evidence

Evidence is local to the Codex verification workspace; it is not deployed with the invitation.

- Existing style screenshot: `/workspace/wedding-mobile-verification/390/section-6-inv-gallery.png`.
- Current production screenshot: `/workspace/wedding-gallery-photo-verification/production-7-390/gallery.png`.
- Uploaded source order: `/workspace/wedding-gallery-photo-verification/uploaded-order.png` and `source-order.json`.
- Combined previous/current style comparison: `/workspace/wedding-gallery-photo-verification/before-after.png`.
- Focused popup evidence: `/workspace/wedding-gallery-photo-verification/production-7-390/photo-01-popup.png` through `photo-07-popup.png`.
- Corresponding 320px captures and Playwright traces are stored alongside these files.

Viewports were 320 × 780 and 390 × 780 CSS px, DPR 2. Section screenshots at 390px are 780 × 1286 physical pixels; the combined style comparison downsamples each to 390 × 643 and aligns them with labeled headers. The intentional content change is from one photo to the seven supplied photographs. The final verification uses actual production photos, not test cards.

The user's structural reference has different photography and serif overlay lettering. Those are intentionally not copied: the user required the invitation's fonts and their own photos. The latest uploaded photos were visually checked in the numbered source sheet and the actual gallery/popup captures. The more overlay was inspected at thumbnail scale, and each popup was reviewed for image loading, source order and proportions, including the landscape fifth photograph.

## Required fidelity surfaces

- Typography: existing Designhouse headings and Pretendard text remain unchanged. More text inherits the current font and uses ivory text; no new font or icon assets were introduced.
- Spacing and layout: three columns at both widths, 8px row/column gaps, 10px corners and 3:4 cells. Existing gallery width, heading, description, top/bottom padding, minimum height and decorative border are retained.
- Colors: original ivory background and brown text remain. More uses `rgba(96, 78, 77, 0.66)`, derived from the invitation's existing brown, with `var(--inv-paper)` text.
- Image quality: all seven uploaded JPEGs are retained byte-for-byte. Thumbnails use cover without stretching; the popup retains its existing contain sizing and the fifth landscape photo's full aspect ratio. Previously committed image/font/audio assets remain unchanged.
- Content: all existing section text is retained. Production renders the first five supplied photos and +2 MORE over the sixth photo, opening 6 / 7. All seven photos are explored in attachment order. Unit tests also cover six-item +1 and additional counts.

## Findings and comparison history

1. [P1, fixed] During implementation, absolute photo-list paths were prefixed twice in client-side Pages popup URLs. The photo list now uses paths relative to public/, and the base path is added once. The final browser checks require every popup image to load with a positive natural width and reject local HTTP errors and duplicated base paths. Both actual-photo and test-data runs pass.
2. The user changed the initial 2px/20px styling preference to confirmed 8px/10px and a brown overlay. The final captures and tests use the confirmed values; the earlier captures are not the final design verdict.
3. No remaining actionable P0/P1/P2 visual or interaction findings within the requested scope.

## Verification

- Real production data: seven supplied photos, at 320px and 390px; correct 3 × 2 preview, +2 MORE, all first five thumbnail entry points, the full visible more-cell hit area, and start at 6 / 7.
- Each popup loads the corresponding photo-01.jpg through photo-07.jpg in order. Both 7 → 1 and 1 → 7 wrap directions, gestures, close/focus/scroll restoration and BGM continuity pass. No synthetic test cards were used in this final run.
- Center/near-image-edge horizontal swipes, vertical/diagonal non-swipes and taps preserve the existing gesture handling and stay on the page.
- No horizontal page overflow, image load failures, local HTTP failures or browser page exceptions in final runs.
- Eight non-gallery sections retain their rendered markup; CSS outside the gallery grid/overlay block is unchanged.
- Pages build, default Next.js build, TypeScript, lint with zero warnings and all eight automated tests pass.

## Residual limits

Real iOS Safari/system-edge gestures and direct access to the production Pages origin remain outside this Chromium/local-output verification. The current six-cell/more state is fully tested with the seven actual uploaded photos.

## Implementation checklist

- [x] Preserve existing styling and all unrelated sections/assets.
- [x] Render only real unique photos in production.
- [x] Match confirmed three-column geometry and more overlay behavior.
- [x] Test all entry points, image loads, navigation, gestures and state restoration.
- [x] Recheck the path fix and final visual captures.
