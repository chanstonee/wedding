# Wedding gallery QA

final result: passed

## Approved implementation

The owner reviewed the local preview, requested the supplied vector frame and
left-clipped cocktail decoration, reviewed the resulting preview, and authorized
deployment. The source of truth is the owner's SVG and the verified preview at
`/workspace/wedding-gallery-vector-preview/preview-390.png`.

- Use the supplied `gallery_frame [Vectorized].svg` byte-for-byte as
  `public/assets/invitation/gallery-frame.svg`, viewBox 0 0 389 620.
  SHA256: 114aa190f96aa419610e7cf33470319ecbaad2b86313a94963ac20f40f207b78.
- Preserve the SVG's native aspect ratio, transparent outside/interior and opaque
  banner fill. Remove the previous JPEG's blend treatment. Keep the archived JPEG
  and all original Figma assets intact.
- Keep the gallery section background explicitly none. The page's ivory backdrop
  remains unchanged. Maintain -46px gallery overlap and reserve 742px for the
  timetable so its grey ribbon continues behind the curved, opaque SVG banner.
- Move only the cocktail decoration to design x=-14, retaining y=555.3, rotation
  and scroll animation. Its sleeve is clipped at the paper's left edge. Cap its
  width at 113.291px so it stays above the frame on larger screens.
- Preserve the approved preview's gallery top, title position and section height.
  The vector's bottom border reflects its native, shorter aspect ratio.
- Preserve all seven supplied photographs in attachment order, 3-column/2-row
  preview, 3:4 cells, 8px gaps, 10px corners, first-five entry points, +2 MORE
  opening at 6/7, popup sizing, gestures, arrows, wrap and close.
- Preserve all other text, fonts, photographs, audio, colors and interactions.

## Verification and evidence

Chromium mobile at 320px, 390px and 509px passed SVG loading and source fidelity,
frame ratio, transparent section layers, no horizontal overflow, unchanged
approved gallery geometry, cocktail clipping and clearance, +2 MORE, next and
previous wrap, close and no page exceptions. Canvas sampling confirms alpha 0
outside the artwork and in the empty interior, and alpha 255 / RGB(241,237,231)
in the banner. Seven non-target section HTML fragments remain identical.

The latest captures were visually compared with the owner's reference: the hand
stays above the frame, the grey ribbon meets the curved banner edge, and the
banner hides the grey artwork without adding a rectangular section background.
No remaining P0/P1/P2 findings in the approved scope.

Pages build (including TypeScript), existing automated tests and zero-warning
lint passed for the approved source. Uploaded, public and exported SVG bytes
match. Tests were completed before approval; the deployment workflow repeats the
Pages build and automated tests for the committed revision.

Evidence: `/workspace/wedding-gallery-vector-preview/preview-320.png`,
`preview-390.png`, `preview-509.png`, complete `boundary-*` and `gallery-*`
captures, `results.json` and `gallery-vector-preview.mjs`.

## Verification limits

Real iOS Safari system-edge gestures and direct production-origin visual checks
remain unverified in this restricted environment. Local browser verification
uses the actual Pages output. Deployment is checked through GitHub Actions.

## Hero couple motion: pending visual review

The preceding gallery/vector/cocktail revision was deployed successfully as
fb2e57e325297f4432d28029c9e5754d2ea0e4c8 (Pages run 40818682802).
The new hero motion is verified locally and has not been pushed or deployed.

Source inspection finds two SVG groups and 314 paths, without semantic body
layers or embedded raster images. The original SVG remains unchanged. Its exact
path attributes and paint order are preserved in hero-couple-paths.json and
rendered as accessible inline SVG by HeroCouple.tsx. Original group opacity and
aspect-ratio behavior are retained. Static original/grouped browser captures
have zero pixel difference at the same viewport and rendering scale.

Motion: 4.8s ease-in-out sway ±1.1° plus upward float by 4 SVG units. Male and
Female rotate independently ±0.22° / ±0.28° about the shared original hand point
(181,24). Separately identifiable dress interior folds and back-hair paths follow
with 0.24s / 0.32s additional delay and ±0.18° / ±0.32° amplitude. Their continuous
body/dress/front-hair silhouettes are not split or redrawn. Heart and star float
by at most 1.3 / 0.8 units with slower periods. See docs/hero-motion.md for the
exact structure, wrapper, CSS and original-layer limits.

At 320px and 390px, 41 sampled phases per width pass: coincident hand anchor,
contact-region displacement under 0.056 CSS px, float range about 3.28/4px,
bounded rotations, seamless core repeat, stable layout, no clipping, horizontal
overflow or collisions with the title. Real-time CSS playback is verified,
including the exported standalone animated SVG. Reduced motion disables all SVG
animations and restores the static drawing. Gallery MORE/wrap/close and BGM
continuity pass; no page exceptions or local HTTP errors occur. Original and
extreme phase captures were visually reviewed. No remaining P0/P1/P2 findings
in the new scope. Actual iOS Safari and physical-device frame rate are unverified.

Pages build with type checking, zero-warning lint and all ten automated tests
pass. Evidence is in `/workspace/wedding-hero-motion-verification/`:
hero-couple-preview.svg (actual SVG/CSS animation), hero-motion.css,
motion-phases.png, original/static-grouped comparisons, results.json,
static-fidelity.json, reduced-motion.json, standalone-preview.json and traces.

## Stronger hero dance: latest pending visual review

The owner found the first motion too subtle on phones. The revised common sway
is ±3.5°, upward float is 11 SVG units (about 9/11/13.5 CSS px at 320/390/480px),
and core period is 3.8s with ease-in-out. Male counter-sway is ±0.55°, Female is
±0.9° with 0.14s later timing, both about the exact shared hand pivot (181,24).

To strengthen the dress and hair without breaking the original connected paths,
reuse their original geometry in upper/lower SVG clips. Dress hem below y=164
uses ±4.5° skewX, 0.24s behind Female; back-hair tips below y=93 use ±3.5° skewX,
0.30s behind Female. A shear is exactly zero along its horizontal seam, preserving
attachment while moving the lower silhouette and folds together. Small clip
edge overlaps prevent antialias gaps. No original path d or paint attribute is
modified. Reduced motion displays the unclipped original rather than segmented
neutral frames, restoring zero-pixel-difference static fidelity.

123 sampled phases across 320/390/480px pass: exact hand anchor and seam position,
contact-region difference below 0.20 CSS px, bounded amplitudes, seamless core
repeat, real CSS playback, no clipping, title overlap or horizontal overflow.
Hem displacement reaches about 6.5/7.9/9.7px and hair-tip displacement about
2.7/3.2/4px. Extreme phase captures were visually reviewed and the stronger
movement is visible at mobile scale without gaps, detached hands or head motion.
Gallery/BGM regression, reduced motion, build/type checks, lint and tests pass.
Real Safari and physical-device FPS remain unverified. No new push/deployment.

Evidence: `/workspace/wedding-hero-motion-stronger-verification/` contains the
animated SVG, old/new SVG comparison HTML, phase PNGs, traces, CSS and detailed
JSON checks. Source: docs/hero-motion.md. No remaining P0/P1/P2 findings in scope.
