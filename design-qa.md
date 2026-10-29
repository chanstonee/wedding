# Guestbook carousel and CTA refinement QA — 2026-10-29 (Asia/Seoul)

Scope: the four user-requested refinements to the deployed invitation: zero guestbook bottom padding, immediately visible message scrolling affordance, adjacent plate previews for multiple messages, and a shared filled CTA family.

## Source and implementation

- Source artwork: unchanged `public/assets/invitation/guestbook-frame.png` (1254×1254 RGBA, byte-identical to the supplied ZIP).
- Before state: `/workspace/wedding-guestbook-verification/ui/section-390.png`, captured from commit de0f12d.
- After state: `/workspace/wedding-guestbook-refinement-verification/section-320.png` and `section-390.png`.
- Combined before/after comparison: `/workspace/wedding-guestbook-refinement-verification/comparison.png`. Both 390px section captures are rendered at their CSS width of 390px from 780px-wide 2× screenshots. The deliberate size/spacing changes follow the new request.
- Focused first-scroll state: `scrollbar-initial-320.png` and `scrollbar-initial-390.png` in the same new evidence directory. Captured at scrollTop 0, before any reading gesture.
- Other focused states: `guestbook-single-320.png`, `guestbook-write-320.png`, `guestbook-short-viewport-320.png`, `guestbook-wrong-password-390.png`, `address-copy-390.png`.
- Runtime: real built app in Chromium mobile/touch emulation, 320×780 and 390×780 CSS px, deviceScaleFactor 2. Google traffic is a local GAS/Sheets adapter; production has no mock data.

## Findings and fixes

- The old native scrollbar could auto-hide and the old hint required reading a sentence. Removed that sentence, hid the platform-dependent native chrome, and show a track/thumb for overflowing messages immediately. The thumb is initially at the top and follows real scrollTop. The actual text remains a keyboard-focusable native scrolling paragraph.
- The old carousel filled the viewport with one plate. Multiple-message slides now use 88% width, centered with a 6% inset and overlapping transparent image margins. A real neighboring plate edge is visible; there are no duplicated message records. Single/empty states remain full width.
- The former styles mixed double borders, transparent buttons and different fills/radii. `app/cta.css` defines one family, 4px corners, 48px minimum height, 16px Pretendard, brown #604e4d and blue #555e6d. Section and dialog CTA instances opt into that family. Navigation/close/toggle/icon controls preserve their appropriate existing forms.
- The guestbook bottom padding is now 0px. The ending's own existing top padding remains unchanged.

Final after captures and the combined comparison were opened and visually inspected. No actionable P0/P1/P2 visual findings remain. The test waits for the initial carousel transition before checking its settled center; that was a test timing correction, not a product alignment fix.

## Required fidelity surfaces

- Typography: existing Designhouse and Pretendard fonts; shared CTA font/line height; no new font assets. Max-length names and full 100-character messages remain readable inside the plate, with native text scrolling for long content.
- Layout: current plate is centered at both widths and neighbors peek at the sides. Original 1:1 plate ratio and section title alignment are retained. No horizontal document overflow.
- Colors: existing brown, ivory and guestbook indigo; no new gradients/shadows. All tested section CTAs share the same fill family and exact 4px radius. Map descriptions and icons contrast with the filled background.
- Asset fidelity: original plate, photos, artwork and audio bytes unchanged. Only CSS presentation and requested CTA classes changed.
- Copy: old scroll instruction removed, no replacement explanatory sentence in the plate. Names/messages/dates and form text remain unchanged.

## Verification

- 320/390px: first visible scrollbar, thumb movement, 100-character reading, centered plate and next preview, vertical/diagonal/short-swipe rejection, valid horizontal swipes, history preservation.
- One message: no artificial neighbor and no pagination. Empty/error states and retry preserved.
- Write/delete, wrong-password rejection, duplicate submit suppression, modal focus trap, scroll restoration and 400px height simulation pass.
- Clipboard address copying, gallery 1→7→1, map modal, accounts accordion, BGM play/pause and actual loop boundary pass.
- CTA computed styles checked on the rendered section buttons and map choices. Build/type checks, automated test suite and lint pass.

## Operational gaps

Google browser traffic remains unverified live because the enforced cloud policy excludes script.google.com and Googleusercontent. This change does not modify the server URL or storage behavior. Actual iOS Safari edge gestures and physical-device keyboard/IME remain unverified; Chromium and viewport-height simulation are not substitutes.

## Checklist

- [x] Source and after screenshots compared together at normalized size.
- [x] All four requested changes visible in the after state.
- [x] Existing asset files and external storage integration preserved.
- [x] Mobile interactions and CTA family verified.
- [x] External verification gaps stated accurately.

final result: passed
