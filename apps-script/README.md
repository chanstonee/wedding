# Google Sheets 방명록 서버

설치 방법은 [`docs/guestbook-setup.md`](../docs/guestbook-setup.md), 저장 구조·보안·제약 및 검증 범위는 [`docs/guestbook-technical.md`](../docs/guestbook-technical.md)를 참고하세요.

`Code.gs`, `Bcrypt.gs`, `Bridge.html`, `appsscript.json`을 동일한 Apps Script 프로젝트에 넣습니다. 시트는 비공개, 웹앱은 소유자로 실행·익명 접근 허용으로 설정합니다. `setupGuestbook_` 초기화 후 `testGuestbookConnection_`으로 실제 시트 점검을 할 수 있습니다. 스프레드시트 ID와 비밀값은 Script Properties에만 저장합니다.

이 폴더와 클라이언트 예제는 기존 청첩장에 연결하거나 Pages에 배포하지 않았습니다. 실제 Google 저장과 브라우저 연동은 웹앱 배포 후 별도 검증이 필요합니다.

## 포함 라이브러리

- bcryptjs **3.0.3**, [dcodeIO/bcrypt.js](https://github.com/dcodeIO/bcrypt.js)
- BSD-3-Clause: [`LICENSE.bcryptjs`](LICENSE.bcryptjs)
- npm 패키지: `bcryptjs@3.0.3`, UMD 배포본 `umd/index.js`
- npm tarball SHA-1: `4b93d6a398c48bfc9f32ee65d301174a8a8ea56f`
- npm integrity: `sha512-GlF5wPWnSa/X5LKM1o0wz0suXIINz1iHRLvTS+sLyi7XPbe5ycmYI3DlZqVGZZtDgl4DmasFg7gOB3JYbphV5g==`

`Bcrypt.gs`는 UMD 파일 앞에 원본 BSD 라이선스 전문 주석을 추가하고, Apps Script에 없는 타이머를 초기화 단계에서 참조하지 않도록 `nextTick`의 타이머 선택 부분을 수정한 파일입니다. 해시 계산 알고리즘·비용·salt 처리는 변경하지 않았습니다. 이 서버는 `hashSync`와 `compareSync`만 사용합니다. 타이머가 없는 환경에서 비동기 bcrypt API를 호출하면 안내 오류로 중단합니다. 전역 타이머를 흉내 내거나 비동기 API를 임의로 즉시 실행하지 않습니다. Apps Script에서 npm이나 외부 CDN 없이 동작하도록 포함했습니다. 배포·재사용 시 라이선스와 저작권 표시를 유지하세요.
