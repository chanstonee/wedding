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
- 커튼을 누르면 디오 〈Popcorn〉 MP3가 반복 재생됩니다. 우측 하단 BGM ON/OFF 버튼으로 일시 정지·이어 듣기를 할 수 있으며, 갤러리·지도 팝업에서도 재생이 유지됩니다.

## 수정 위치

- `app/components/Invitation.tsx`: 문구, 계좌, 지도 링크, 타임테이블, 상호작용
- `app/invitation.css`: Designhouse/Pretendard 폰트와 화면 스타일
- `public/assets/invitation/`: 수정 없이 내려받은 원본 일러스트와 폰트
- `figma-assets.json`: 원본 에셋 목록과 크기

갤러리 사진 목록은 `app/lib/gallery.mjs`의 `galleryPhotoFiles`에서 관리합니다. 첨부된 실제 사진 7장을 업로드 순서대로 등록했으며, 원본은 `public/assets/invitation/gallery/photo-01.jpg`부터 `photo-07.jpg`까지 보존합니다. 썸네일은 3열·3:4 비율·8px 간격·10px 모서리이고, 처음 5장과 숨겨진 사진 2장을 나타내는 브라운 반투명 `+2 MORE` 셀을 보여 줍니다. 더보기는 여섯 번째 사진부터 팝업을 열며 7장 전체를 순환 탐색합니다. 실제 계좌를 적용할 때는 `accounts` 배열을 수정하고 예시 안내 문구도 함께 정리하세요.

## GitHub Pages

Node.js 22.13.0 이상을 사용합니다.

```bash
npm ci
npm run build:pages
node --test tests/*.test.mjs
```

`main`에 푸시하면 `.github/workflows/pages.yml`이 빌드와 검사를 거쳐 배포합니다. GitHub Pages Source는 **GitHub Actions**를 사용합니다. 출력은 `out/`이며 이미지·폰트·팝업의 경로는 저장소 경로 `/wedding`을 포함합니다.

다른 저장소 이름을 사용하면 `PAGES_BASE_PATH`를 변경하세요. 사용자 도메인에서는 빈 값을 사용할 수 있습니다.

현재 청첩장은 관리자 로그인과 Supabase 연결을 사용하지 않으며, 별도 환경변수 없이 실행할 수 있습니다. 이전 `/admin/` 라우트는 제거했습니다. 기존 방명록 데이터베이스의 스키마·권한 SQL은 [보존 기록](supabase/README.md)으로 남겨 두며, 외부 서비스의 데이터는 변경하지 않습니다.

## 이전 디자인 분리

이 저장소는 현재 Figma 청첩장의 소스를 관리합니다. 이전 분홍·블루 민트 테마, 옛 화면 소스, 불필요한 스타터 예제는 [Wedding-Invitation](https://github.com/chanstonee/Wedding-Invitation)에 보관했습니다. 파일 이동 목록은 해당 저장소의 `archive/separation-manifest.json`을 확인하세요.

이전 디자인 분리 커밋에는 `[skip ci]`를 사용했으며, 이후 `main` 변경은 위 Pages 워크플로로 배포합니다.
