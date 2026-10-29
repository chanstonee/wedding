# Guestbook keyboard QA — 2026-10-29 (Asia/Seoul)

Scope: guestbook write/delete modal viewport handling only. Other invitation sections, gallery, CTA family, assets and server are unchanged.

## Source and rendered evidence

- Source: actual pre-change modal from aa1599c, captured at 320×780 and 390×780 CSS px, deviceScaleFactor 2.
- Original captures: `/workspace/wedding-guestbook-keyboard-verification/baseline-320.png` (576×1148 px), `baseline-390.png` (716×1112 px).
- After: `closed-320.png`, `closed-390.png`, same pixel dimensions. Layout viewport size and scale are identical.
- Combined comparison opened and inspected: `/workspace/wedding-guestbook-keyboard-verification/comparison.png`. Source and after dialog crops are normalized from 2× to 288px/358px CSS dialog widths side by side.
- Focused visible-area captures: `visible-name-keyboard-320.png`, `visible-password-keyboard-390.png`, `visible-message-caret-320.png`, `visible-submit-keyboard-390.png` in the same evidence directory. These are crops of the simulated visual viewport, not fabricated native keyboard imagery.
- Full simulation captures and results: `name-keyboard-*.png`, `message-caret-*.png`, `submit-keyboard-*.png`, `restored-*.png`, `results.json`.

## Findings and fixes

1. [P1, fixed] The previous dialog itself scrolled, taking its title/close button away. A separate shrinking form viewport now scrolls while the header remains outside it. Overflow is confined to that viewport.
2. [P1, fixed] Viewport changes did not reveal active fields/caret lines. visualViewport height/offsetTop updates are coalesced in requestAnimationFrame and scroll only the form and textarea, preserving focus and selection.
3. [P1, fixed] Overflow-only background locking could allow iOS page pan. Guestbook-specific body locking retains document height and scroll position; owned styles and prior focus restore on close.

No actionable P0/P1/P2 visual differences remain in the rendered comparison. Physical iOS verification is an operational gap, not an asserted pass.

## Fidelity surfaces

- Typography: original Designhouse/Pretendard, sizes and line height retained; text, character counters and labels unchanged.
- Spacing/layout: closed 320px dialog is 288×574px at (16,103); closed 390px dialog is 358×556px at (16,112). Header, name/password/textarea/submit rectangles match the original within 0.5px after opening and after keyboard dismissal.
- Colors/tokens: identical background, borders, padding, 10px panel rounding and existing 4px CTA rounding. No z-index increase or arbitrary keyboard top offset.
- Imagery: close icon and all other original asset bytes unchanged. Comparing the closed dialog interiors yields zero differing pixels; small outside-corner compositing differences are separated from app-owned content.
- Copy/content: unchanged name/password/message inputs, 20/100-character limits, registration/deletion and error messages. No implementation details were added to the product UI.

## Interactions verified

Chromium mobile/touch at both widths, with unchanged 780px layout viewport and separately simulated visualViewport heights 340/300/240px and offsets 0/35/54/76px:

- Each input remains visible; textarea's active first/last line remains in the visible form region with 100 characters over 50 lines.
- Focus/selection preserved after resize and viewport-scroll events.
- Manual touch scrolling does not snap back to the textarea; header stays pinned and submit remains reachable.
- Keyboard dismissal restores original geometry, repeat opening is stable, and reduced-height submission succeeds through the local server adapter.
- Background position and all owned body/html inline styles restore; resize/scroll/selection listener counts return to baseline after each close.
- Existing automated tests, build/types and lint pass. Full original mobile regression passes with the new modal.

## Limits

No physical iPhone Safari, native iOS keyboard or real iOS viewport-pan behavior is available here. Do not interpret simulated visualViewport tests as actual iOS Safari certification. Actual Google browser traffic remains blocked by environment policy; tests use a local GAS/Sheets adapter.

## Checklist

- [x] Source/after closed screenshots compared at normalized size.
- [x] Existing closed design preserved.
- [x] Form-only scroll and fixed header visible under reduced viewport.
- [x] Active field, multiline caret and submit reachable.
- [x] Background, focus, selection and listener cleanup checked.
- [x] Unavailable native-device tests explicitly distinguished.

final result: passed
