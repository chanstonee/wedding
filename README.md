# 재훈 & 다연의 웨딩 초대장

[Figma 원본](https://www.figma.com/design/82VauLlSd0Fqgd7kQuSBgt/wedding_dayeon?node-id=29-4263) 기반의 모바일 초대장입니다.

공개 주소: https://chanstonee.github.io/wedding/

표지 → 초대의 글 → 날짜 → 오시는 길 → 타임테이블 → 웨딩스냅 → 계좌 → 참석 여부 → 엔딩 순서로 구성합니다. 엔딩 다음에는 섹션을 추가하지 않습니다.

- 탭하면 물결 모양 커튼이 좌우로 열립니다.
- 별과 아이콘은 스크롤 위치에 따라 크기가 변하고, 타임테이블 항목은 순서대로 강조됩니다.
- 사진은 클릭하여 확대하고 방향키 또는 터치 스와이프로 이동합니다.
- 계좌는 아코디언이며 복사 버튼이 있습니다. 현재 번호는 예시입니다.
- 지도 선택 레이어에서 네이버지도, 카카오지도, 티맵으로 이동합니다. 티맵 앱 실행은 모바일 기기의 앱 설치 상태에 따라 달라집니다.
- 참석 응답은 기기 공유 또는 내용 복사로 신랑·신부에게 직접 전달합니다. 서버에 자동 저장하지 않습니다.
- 모션 줄이기 설정, 키보드 탐색, 팝업 초점 가두기와 초점 복원을 지원합니다.
- 커튼을 누르면 성시경 〈두 사람〉 MP3가 반복 재생됩니다. 우측 하단 BGM ON/OFF 버튼으로 일시 정지·이어 듣기를 할 수 있으며, 갤러리·지도 팝업에서도 재생이 유지됩니다.

## 수정 위치

- `app/components/Invitation.tsx`: 문구, 계좌, 지도 링크, 타임테이블, 상호작용
- `app/invitation.css`: Designhouse/Pretendard 폰트와 화면 스타일
- `public/assets/invitation/`: 수정 없이 내려받은 원본 일러스트와 폰트
- `figma-assets.json`: 원본 에셋 목록과 크기

갤러리 네 칸은 Figma 원본과 같이 같은 사진을 사용합니다. 실제 계좌를 적용할 때는 `accounts` 배열을 수정하고 예시 안내 문구도 함께 정리하세요.

## GitHub Pages

Node.js 22.13.0 이상을 사용합니다.

```bash
npm ci
npm run build:pages
node --test tests/*.test.mjs
```

`main`에 푸시하면 `.github/workflows/pages.yml`이 빌드와 검사를 거쳐 배포합니다. GitHub Pages Source는 **GitHub Actions**를 사용합니다. 출력은 `out/`이며 이미지·폰트·팝업의 경로는 저장소 경로 `/wedding`을 포함합니다.

다른 저장소 이름을 사용하면 `PAGES_BASE_PATH`를 변경하세요. 사용자 도메인에서는 빈 값을 사용할 수 있습니다.

기존 `/admin/` 방명록 관리 페이지와 Supabase 설정은 유지하며, 새 초대장에는 방명록 섹션을 노출하지 않습니다. 관련 설정은 [Supabase 안내](docs/guestbook-setup.md)에 있습니다.

## 이전 디자인 분리

이 저장소는 현재 Figma 청첩장과 배포 중인 관리자 페이지의 소스만 관리합니다. 이전 분홍·블루 민트 테마, 옛 화면 소스, 불필요한 스타터 예제는 [Wedding-Invitation](https://github.com/chanstonee/Wedding-Invitation)에 보관했습니다. 파일 이동 목록은 해당 저장소의 `archive/separation-manifest.json`을 확인하세요.

이번 파일 정리 커밋에는 `[skip ci]`를 사용하므로 현재 공개된 사이트는 다시 배포하지 않습니다.
