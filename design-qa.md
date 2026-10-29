# Wedding gallery frame QA

final result: passed

## Scope and reference

Replace only the gallery's cloud border with the owner's latest uploaded ribbon
frame. The supplied file is a 720 × 1280 JPEG with a white background, despite the
request naming PNG. `public/assets/invitation/gallery-frame.jpg` preserves the
uploaded bytes exactly (SHA256
`10bba753d282f5d75964292770220cd68a487e4871306439b5bbd013e180f829`).
Original Figma cloud/ribbon assets remain in the repository.

The frame uses its natural aspect ratio at full section width, with no crop or
stretch. Its white background multiplies into the gallery's existing ivory paper.
The redundant gallery-only ribbon decoration is replaced by the frame's ribbons.
Gallery top padding reserves space below the central seal/ribbon. The minimum
section height accommodates the frame at larger widths and preserves the 642px
minimum on small phones. Other section styles and markup remain unchanged.

## Preserved design and behavior

Existing title, copy, fonts, ivory/brown colors, seven photographs in attachment
order, three columns/two rows, 3:4 thumbnails, 8px gaps, 10px corners, gallery width,
and +2 MORE overlay remain unchanged. First five thumbnails open their photo;
MORE opens 6 / 7. Popup image sizing, gesture handlers, arrow controls, 7 → 1 and
1 → 7 wrap, close, focus/scroll restoration and BGM remain unchanged.
The decorative image has empty alt text, an aria-hidden parent and no pointer
hit area, so gallery touch targets remain accessible and unobstructed.

## Browser evidence and verification

Actual Chromium mobile captures at 320 × 780 and 390 × 780 CSS px, DPR 2:

- `/workspace/wedding-gallery-frame-verification/production-7-320/gallery.png`
- `/workspace/wedding-gallery-frame-verification/production-7-390/gallery.png`
- `results-7.json`, traces, videos and all seven popup captures alongside them.

The latest screenshot and uploaded reference were visually inspected. At both
widths the complete frame is visible without stretching; its seal/ribbon stays
above the heading, the side ornaments stay clear of photo cells, and the bottom
ornament clears the grid. The paper remains ivory rather than the JPEG's white.
No remaining P0/P1/P2 visual findings in the requested scope.

Twelve browser check groups pass across both widths: correct frame URL/loading,
720:1280 ratio, content safe areas, non-intercepting decoration; grid dimensions,
fonts/images and no horizontal overflow; all first-five thumbnail entry points;
MORE center/edge hit areas and 6 / 7 start; all seven popup images in order and
both wrap directions; central/near-edge horizontal swipes, vertical/diagonal/tap
rejection, close/focus/scroll restoration, BGM continuity, no page exceptions or
local request failures. The build, TypeScript, zero-warning lint and eight
existing automated tests pass. All eight non-gallery sections have identical
exported markup, and no previously committed photos/fonts/audio were modified.

Real iOS Safari system-edge gestures and direct production-origin visual checks
remain unverified in this restricted environment. GitHub Actions confirms Pages
publication; the local browser uses the actual Pages build output.
