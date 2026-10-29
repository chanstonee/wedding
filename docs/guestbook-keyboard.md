# 방명록 팝업 키보드 대응

## 원인

기존 팝업은 `.gb-dialog` 전체에 스크롤을 적용하여 제목·닫기 버튼도 입력 폼과 함께 움직였습니다. visualViewport의 높이와 위치는 React 상태로 반영했지만, 가시 영역이 바뀐 뒤 활성 입력창을 폼 내부로 노출하는 처리가 없었습니다. 배경 잠금은 iOS에서 충분하지 않을 수 있는 overflow hidden에 의존했습니다.

## 변경 파일과 처리

- `app/components/GuestbookModal.tsx`: 방명록 전용 팝업을 분리했습니다. visualViewport의 height·offsetTop과 resize·scroll, window resize를 animation frame 하나로 묶어 갱신합니다. 임의의 키보드 높이·top 보정값이나 z-index 변경을 사용하지 않습니다.
- `app/components/Guestbook.tsx`: 분리한 팝업을 import합니다. 입력 검증·글자 수 제한·등록·삭제·캐러셀 로직은 그대로입니다.
- `app/guestbook.css`: 바깥 팝업은 flex column + overflow hidden, 헤더는 flex-shrink 0, `.gb-dialog-body`만 min-height 0 + overflow-y auto + momentum scrolling입니다. 폼의 기존 위치와 focus outline 공간을 유지하기 위해 내부 8px 패딩과 같은 크기의 음수 마진을 짝으로 적용했습니다. 이 값은 기존 포커스 외곽선 공간이며 키보드 위치 보정값이 아닙니다.

활성 필드가 가시 영역 밖에 있을 때 폼 컨테이너의 scrollTop만 조정합니다. scrollIntoView로 페이지 전체를 이동시키지 않습니다. textarea는 현재 폰트·너비·줄바꿈과 선택 위치를 반영하는 임시 텍스트 미러로 커서 줄을 측정하고, textarea 내부 스크롤과 폼 스크롤만 조절합니다. 값·선택 범위·포커스를 변경하지 않습니다. 비밀번호는 미러에 복제하지 않으며 메시지 미러는 측정 직후 제거합니다.

수동 스크롤 중 선택 범위가 바뀌지 않은 selectionchange는 무시하여 폼이 커서로 계속 되돌아가지 않게 합니다. 폼 스크롤 자체에는 자동 재정렬을 연결하지 않았습니다.

배경은 방명록 팝업이 열린 동안에만 body fixed로 잠급니다. 문서의 현재 높이를 유지해 window.scrollY가 0으로 줄어들지 않도록 하여 배경의 기존 스크롤 애니메이션도 보존합니다. 종료 시 소유한 인라인 스타일, 페이지 위치와 원래 포커스를 복원합니다. 기존 부모 컴포넌트의 overflow 잠금과 충돌하지 않도록 같은 스타일 속성을 덮어쓰지 않습니다.

visualViewport·window·focus/input·selectionchange·touchmove 리스너, ResizeObserver와 예약된 animation frame을 모두 정리합니다. 팝업 밖 드래그만 막고 폼 입력·텍스트 선택·여러 손가락 제스처는 전역에서 차단하지 않습니다.

## 검증 결과 (2026-10-29, 한국 시간)

- 빌드 및 타입 검사, 기존 자동 테스트 23개, Lint 통과.
- 320/390px Chromium touch 환경에서 layout viewport는 780px로 유지하고 visualViewport만 340/300/240px로 축소, offsetTop은 0/35/54/76px로 변경했습니다. window 높이를 줄이는 것만으로 키보드를 검증했다고 판정하지 않았습니다.
- 이름·비밀번호 필드 노출, 100자 50줄 메시지의 마지막 커서 줄, 첫 줄↔마지막 줄 선택 이동과 포커스 유지 통과.
- 폼의 실제 터치 스크롤, 헤더 고정, 등록 버튼 접근, 축소 상태의 실제 폼 제출 통과. 저장은 로컬 GAS/Sheets 어댑터입니다.
- 키보드 닫기 후 팝업·헤더·입력·등록 버튼의 위치/크기와 색상·테두리·패딩·폰트가 기준과 0.5px 이내로 동일합니다. 팝업 내부 캡처 픽셀은 동일하며 둥근 모서리 바깥의 배경 합성 픽셀은 비교에서 구분했습니다.
- 반복 열기·닫기 후 리스너 수가 원래대로 돌아오며 body/html 스타일과 페이지 스크롤 위치 복원 확인.
- 기존 모바일 회귀: 방명록 작성/삭제/비밀번호 오류/중복 제출, 접시 캐러셀, 주소 클립보드, 사진 1→7→1, 지도 팝업, 계좌 아코디언, BGM 재생/정지/반복 통과.

**실제 iPhone Safari·네이티브 키보드는 이 환경에서 실행하지 못했습니다. 위 결과는 Chromium의 visualViewport 시뮬레이션이며 실제 iOS 통과로 판정하지 않습니다.** 실제 Google 브라우저 통신의 기존 네트워크 제약도 변하지 않았습니다.

## 재현

Pages 빌드를 `/wedding/` 경로로 제공하는 로컬 서버와 Playwright/Chromium이 필요합니다. 새로운 npm 의존성을 추가하지 않았습니다.

```sh
npm run build:pages
PLAYWRIGHT_MODULE=/설치경로/playwright/index.mjs GUESTBOOK_TEST_ORIGIN=http://127.0.0.1:4174 CHROMIUM_EXECUTABLE=/usr/bin/chromium node tests/browser/guestbook-keyboard.mjs
```

`tests/fixtures/guestbook-modal-baseline.json`은 수정 전 aa1599c에서 직접 캡처한 닫힘 상태의 기준입니다. 테스트 중 자동으로 현재 결과로 바꾸지 않습니다. `GUESTBOOK_CAPTURE_BASELINE=1`은 별도 출력 폴더에 수동 비교용 캡처를 만드는 옵션이며 커밋된 기준을 덮어쓰지 않습니다.
