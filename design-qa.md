# Guestbook design QA — 2026-10-29 (Asia/Seoul)

Scope: the new guestbook before the ending and the address copy touch target. Existing invitation design, typography and artwork are the visual baseline. The supplied reference establishes a centered card carousel, not a replacement global design system.

**Source visual truth**

- Original `plate2.png` from the user's `plate2.png.zip`, copied byte-for-byte to `public/assets/invitation/guestbook-frame.png`.
- Source is 1254×1254 RGBA; transparent corners, no crop or recoloring. Width/height remain 1:1.
- Existing Designhouse/Pretendard fonts, ivory `#f4f0e7`, brown `#604e4d`/`#866a6a`, existing indigo `#555e6d`.

**Implementation evidence**

- Browser: Chromium with touch and mobile emulation at 320×780 and 390×780 CSS px, deviceScaleFactor 2.
- Source/implementation side-by-side: `/workspace/wedding-guestbook-verification/ui/comparison.png` (900×920 px, 1× composition).
- Actual card captures: `ui/card-320.png` (640×640 px) and `ui/card-390.png` (780×780 px). Compared at 320×320 and 390×390 CSS px against the source PNG at those same sizes.
- Full section captures: `ui/section-320.png`, `ui/section-390.png`.
- Focused states: `ui/guestbook-long-320.png`, `ui/guestbook-long-390.png`, `ui/guestbook-write-390.png`, `ui/guestbook-short-viewport-320.png`, `ui/guestbook-wrong-password-390.png`, `ui/address-copy-320.png`.
- Empty/failure: `ui/guestbook-empty-320.png`, `ui/guestbook-connection-error-390.png`.
- All `ui/` paths above are under `/workspace/wedding-guestbook-verification/`.
- These are real rendered app screenshots using the real prepared Bridge/server code with a LOCAL Sheets/GAS adapter. They are not screenshots of live Google storage. Test messages are absent from production code.

**Findings and comparison history**

1. [P1, fixed] Horizontal swipes beginning in the independently scrolling message body were cancelled by the browser. Added scoped `touch-action: pan-y pinch-zoom` and horizontal overscroll containment to both the carousel and message body. Final Chromium tests pass center/near-edge horizontal swipes, reject short/vertical/diagonal gestures, and preserve browser history.
2. [P1, fixed] A 20-character name plus a 100-character message left insufficient reading height at 320px. Reduced the long-name font within the existing typography and tightened the card's internal spacing. Final 100-character text is preserved; its reading pane measures 52px tall at 320px and 77px at 390px. The full body can be read by vertical scrolling with a visible hint. Name/date remain separate fixed HTML text.
3. [P2, fixed] Expanding the address button box directly would change the venue paragraph's line layout. A 32×28px inline slot preserves the existing layout, with a centered actual 44×44px button extending its touch target. Real Chromium clipboard tests pass at both widths.

Post-fix captures listed above were opened and inspected. The combined source/implementation comparison preserves the original ribbon, flowers, contour, transparency and scale. Text stays inside the central safe rectangle. Original HTML text remains selectable; the artwork has no text baked into it.

**Required fidelity surfaces**

- Fonts/typography: existing font files load in Chromium; section heading and modal follow existing Designhouse/Pretendard rules. The English heading uses existing indigo. Input text remains 16px. Long-name adjustment is scoped to the guestbook.
- Spacing/layout rhythm: standard section gutters and title hierarchy; one centered square card, original aspect ratio; new content precedes ending. No content appended after ending. The address slot preserves its prior flow geometry.
- Colors/tokens: warm ivory, brown and existing indigo; no new gradients or card shadows. The asset's own original subtle shading is retained.
- Image quality: original PNG bytes identical to ZIP; all original assets unchanged. No broken image or horizontal viewport overflow at either width.
- Copy/content: exact requested heading, description, submit label, field labels and placeholders; public messages rendered as HTML text; exact address success toast. Counts use Unicode code points. No fabricated production messages.

**Interactions checked**

- Actual touch swipes, short/diagonal/vertical rejection, arrows and position indicator.
- Write, immediate carousel insertion, duplicate-submit suppression, incorrect-password rejection, deletion and refresh.
- Modal Tab trap, background inertness, scroll restoration, and 400px viewport height simulation with submit reachable.
- Empty state, connection failure with retry, no false saved-message success.
- Actual address clipboard; gallery 1→7→1 wrap/open/close; map modal and three links; account accordion.
- BGM play/pause and actual audio loop boundary; curtain opens. No browser page errors.
- Eight unrelated sections' static DOM matches the pre-change build exactly; all original asset bytes remain unchanged.

**Operational gaps**

- Actual Google browser integration, anonymous permission and current deployed Bridge are unverified because the managed environment blocks script.google.com. This visual QA pass does not certify live integration.
- User supplied owner self-test logs show real Google Sheet create/read/password rejection/delete/completed all true.
- Actual iOS Safari edge gestures, physical-device keyboards/IME and external native map application launches are unverified. Chromium height simulation is not a real mobile keyboard test.

**Implementation checklist**

- [x] Original asset placed, byte equality and alpha verified.
- [x] Source and implementation opened together at normalized sizes.
- [x] P1/P2 visual and touch findings fixed and recaptured.
- [x] Mobile app interaction tests, build/type checks, server tests and lint pass.
- [x] Known external verification gaps explicitly distinguished.

**Follow-up polish**

- Existing floating BGM control can overlap content at particular scroll positions; its original global placement remains unchanged. The guestbook modal hides the control while preserving audio playback, as existing modals do.

final result: passed
