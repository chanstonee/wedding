# 방명록 서버 구조와 검증 범위

## 현재 범위

서버 코드와 브라우저 클라이언트 예제를 준비했습니다. `examples/guestbook-client.mjs`는 기존 청첩장에서 import하지 않으며, 앱·에셋·스타일·Pages 워크플로는 변경하지 않았습니다. 방명록 UI, 프레임 이미지 배치 및 주소 복사 버튼의 추가 수정은 이번 서버 준비에 포함되지 않습니다.

### 새 웹앱 URL 수신 후 상태 (2026-10-29, 한국 시간)

- 사용자가 제공한 실제 실행 로그에서 `created`, `read`, `wrongPasswordBlocked`, `deleted`, `completed`가 모두 `true`임을 확인했습니다. 소유자가 실행한 실제 시트 등록·조회·비밀번호 오류 거절·삭제 검증은 통과했습니다. 제가 Google 서버에 직접 접속해 재실행한 결과는 아닙니다.
- 사용자의 버전 2 배포 완료 화면과 새 `/exec` URL을 받았습니다. `app/lib/guestbook-client.mjs`에 새 URL로 클라이언트를 생성하는 진입점을 준비했습니다. 시트 ID·비밀값은 포함하지 않습니다.
- 이 모듈은 Invitation에 아직 import하지 않았습니다. 기존 청첩장 화면과 Pages 배포는 유지합니다.
- 새 URL도 클라우드 프록시 CONNECT 403으로 차단되었고, 웹 읽기 도구에서도 열리지 않았습니다. 실제 웹앱의 HTTP 상태·익명 접속 권한·Bridge 응답은 미검증입니다. 배포 성공 화면만으로 브라우저 통신 성공을 판정하지 않습니다.
- 원형 방명록 프레임은 대화에서 시각적으로 확인했지만, 작업 폴더에 원본 PNG 파일이나 다운로드 가능한 파일 참조가 없습니다. 임의로 재생성하거나 기존의 다른 프레임으로 대체하지 않습니다. 최종 화면 구현에는 원본 파일 확보가 필요합니다.

## 저장 구조

비공개 스프레드시트 `Guestbook` 탭의 열은 다음 순서입니다. 열 이름과 순서를 유지하세요.

| 열 | 내용 | 공개 API 반환 |
| --- | --- | --- |
| `id` | 서버 생성 UUID | `id` |
| `created_at` | 서버 생성 ISO 작성 시각 | `createdAt` |
| `name_json` | 이름의 JSON 문자열 | 디코딩한 `name` |
| `message_json` | 메시지의 JSON 문자열 | 디코딩한 `message` |
| `password_hash` | bcrypt 비용 12, 개별 salt 포함 | 반환 안 함 |
| `request_id` | 중복 등록 방지 UUID | 반환 안 함 |
| `visitor_key` | 방문자 식별자의 서버 HMAC | 반환 안 함 |
| `request_digest` | 입력 일치 확인용 서버 HMAC | 반환 안 함 |

사용자 입력은 JSON 문자열 및 셀 텍스트 형식으로 저장하여 `=`, `+` 등으로 시작하는 입력이 수식으로 실행되는 것을 방지합니다. 프런트엔드에서는 이름과 메시지를 HTML로 삽입하지 않고 React 텍스트 또는 `textContent`로 표시해야 합니다. 문자열에 링크·스크립트를 자동 실행하는 기능은 없습니다.

비밀번호는 서버 비밀값으로 HMAC-SHA256 전처리 후 bcrypt로 해시합니다. 전처리는 bcrypt의 72바이트 입력 잘림을 피합니다. 랜덤 salt는 Apps Script UUID와 서버 비밀값으로 생성합니다. 비교도 서버에서 수행합니다. 비밀번호·해시·서버 비밀값은 공개 응답, URL, 브라우저 저장소와 로그에 넣지 않습니다. HTTPS로 전달된 평문 비밀번호는 해시 계산을 위한 요청 메모리에만 존재합니다.

스크립트 속성에는 `SPREADSHEET_ID`, `PRIVATE_PEPPER`, `ALLOWED_ORIGINS`, 요청 제한 카운터와 캐시 버전이 저장됩니다. 시트와 프로젝트 편집자는 신뢰할 수 있는 소유자로 제한하세요. 비밀값 변경 시 기존 비밀번호 해시를 확인할 수 없습니다. 비밀번호 복구 기능은 없습니다.

## GitHub Pages 통신 방식

**직접 `fetch` 또는 JSONP를 사용하지 않습니다.** Apps Script ContentService는 별도 URL로 리다이렉트되며 임의의 CORS 응답 헤더에 의존하는 설계는 피했습니다. `fetch(..., {mode:'no-cors'})`는 응답을 읽을 수 없으므로 저장 성공 판정에 사용할 수 없습니다.

제공한 방식은 다음과 같습니다.

1. Pages가 Apps Script 웹앱을 숨겨진 iframe으로 엽니다. URL에는 공개 출처와 무작위 nonce만 넣습니다.
2. `doGet`이 허용 출처를 검사하고 `Bridge.html`을 HtmlService로 제공합니다.
3. Google의 중첩 iframe 내부에서 `google.script.run.guestbookRpc`를 호출합니다.
4. Pages와 브리지는 출처·nonce·프로토콜·요청 ID·응답 창을 확인한 `postMessage`로 통신합니다.

HtmlService 임베딩을 위해 `XFrameOptionsMode.ALLOWALL`을 사용합니다. 브리지는 화면 입력이 없는 통신 전용이며 허용 출처의 최상위 창 요청만 수락합니다. 서버 헬퍼는 모두 `_`로 끝나 공개 RPC에서 호출할 수 없습니다. `doGet`과 `guestbookRpc`만 공개 함수입니다.

출처 검사는 브라우저 통신의 혼선을 줄이는 장치이며 사용자 인증은 아닙니다. 이 서버는 공개 익명 방명록입니다. 클라이언트 코드나 출처를 숨겨 보안을 확보한다고 가정하지 않습니다. 삭제 권한은 서버의 비밀번호 검증으로 확인합니다. 방문자 UUID도 인증정보가 아닙니다.

실제 Google 배포의 익명 권한, iframe 정책, 브라우저 추적 차단 설정, 서버 실행 시간은 배포 후 확인해야 합니다. 로컬 모사 테스트만으로 실제 Google CORS/iframe 연동 성공을 선언하지 않습니다.

## 클라이언트 사용 규약

`examples/guestbook-client.mjs`는 아직 제품 UI에 연결하지 않은 통신 예제입니다.

```js
import { GuestbookClient } from './guestbook-client.mjs';

const client = new GuestbookClient('https://script.google.com/macros/s/배포_ID/exec');
const firstPage = await client.bootstrap();
// 입력하는 동안 세션 발급 후 최소 2.5초가 경과해야 합니다.
const requestId = crypto.randomUUID();
const created = await client.create({
  name: '홍길동', message: '결혼을 축하합니다!', password: '사용자가 정한 비밀번호', website: '',
}, requestId);
const page = await client.list();
// 다음 페이지가 있다면 client.list(page.nextCursor)
// 실제 UI에서 삭제 확인을 받은 뒤에만 confirm: true 전달
await client.delete(created.id, '사용자가 정한 비밀번호', true);
client.destroy();
```

모든 응답 메시지는 `{id, createdAt, name, message}`만 포함합니다. 목록은 최신순, 한 페이지 30건이며 같은 시각에는 UUID로 순서를 고정합니다. `nextCursor`가 있으면 다음 페이지를 조회합니다. 공개 첫 페이지 캐시는 최대 30초이며 등록·삭제 시 새 캐시 버전으로 전환합니다. 최대 저장 메시지는 5,000건입니다. 초과 시 기존 데이터를 삭제하지 않고 등록을 거절합니다.

등록 타임아웃처럼 결과가 불확실하면 **같은 입력과 같은 `requestId`로 재시도**합니다. 이미 저장됐다면 기존 메시지를 반환해 중복을 막습니다. 입력을 고쳤다면 새 ID를 사용합니다. 페이지를 떠나면 비밀번호와 요청 내용을 저장하지 않습니다. 클라이언트 localStorage에는 임의 방문자 UUID만 보관하며 저장소가 차단되면 메모리로 동작합니다.

세션은 서버 HMAC 서명·방문자 바인딩·1시간 만료를 적용합니다. 클라이언트는 만료 시 한 번 재발급합니다. 재발급 직후 등록이 `TOO_FAST`이면 최소 3초 후 같은 요청으로 재시도합니다. 중복 제출은 UI에서도 비활성화해야 합니다. 동시 RPC는 브리지에서 `BUSY`로 거절합니다.

| 오류 코드 | 의미 / UI 처리 |
| --- | --- |
| `INVALID` | 이름 1~20자, 메시지 1~100자, 비밀번호 4~64자 등 입력 확인 |
| `TOO_FAST` | 최소 작성 시간 미충족, 안내 후 재시도 |
| `PASSWORD` | 삭제 비밀번호 불일치 |
| `RATE` | 요청 제한, `retryAfter`초 후 시도 |
| `SESSION` | 세션 갱신 필요 (예제는 한 번 자동 갱신) |
| `BUSY` | 서버 또는 브리지가 처리 중, 잠시 후 재시도 |
| `CAPACITY` | 저장 상한 도달, 소유자 확인 필요 |
| `UNAVAILABLE` | 시트·설정·할당량 등 서버 연결 문제, 내부 정보 미노출 |
| `CONNECTION` / `TIMEOUT` | 브라우저 연결 / 응답 확인 실패, 성공으로 표시하지 않음 |

## 기본 스팸 방지

이름·메시지 길이, 필수값, 제어문자, 요청 크기, UUID, 삭제 확인값을 서버에서 검사합니다. 숨겨진 `website` 필드는 빈 값이어야 하며, 세션 발급 후 2.5초 이내 등록은 거절합니다. 프런트엔드는 실제 honeypot 필드와 중복 제출 방지를 구현해야 합니다.

요청 제한은 Script Properties와 ScriptLock으로 관리하며 단순 캐시 제거로 초기화되지 않습니다. 창은 첫 요청에서 시작하고 지정 시간이 지나면 리셋됩니다. `bootstrap` 때 만료 카운터를 주기적으로 정리합니다.

| 대상 | 제한 |
| --- | --- |
| 최초 연결 `bootstrap` | 전체 600회/분, 1,000회/일 |
| 추가 목록 조회 | 전체 600회/분, 1,500회/일 |
| 등록 시도(중복 재시도 포함) | 전체 800회/일, 방문자별 20회/10분 |
| 신규 등록 | 전체 120회/시간·500회/일, 방문자별 3회/10분·20회/일 |
| 삭제 시도 | 전체 120회/시간·500회/일, 방문자별 8회/10분 |
| 기존 메시지별 삭제 시도 | 방문자를 바꾸어도 동일 메시지 5회/30분 |

방문자 ID는 바꿀 수 있으므로 방문자별 제한만 신뢰하지 않습니다. 전체 및 메시지별 제한을 함께 적용합니다. Apps Script 웹앱 이벤트에는 신뢰할 수 있는 방문자 IP가 제공되지 않으므로 IP 제한을 구현했다고 주장하지 않습니다. 익명 공개 엔드포인트이므로 고도화된 봇이나 DDoS를 완전히 막을 수 없고, 공격자가 전체 할당량을 소진해 일시 중단시킬 수 있습니다. 단순 방지책을 CAPTCHA 또는 강한 사용자 인증과 동등하게 보지 않습니다.

무료 사용량은 Google 정책에 따라 달라집니다. 예를 들어 개인 계정의 Script Properties 읽기/쓰기 할당량은 일 50,000회이며 실행 시간·동시 실행 등 별도 제한도 있습니다. 위 자체 요청 상한이 Google 할당량 전체를 보장하지 않습니다. 초과·오류는 `UNAVAILABLE`로 처리하고 저장 성공으로 가장하지 않습니다. 유료 플랜·유료 API·과금 계정은 추가하지 않았습니다.

## 검증 결과 (2026-10-29)

| 항목 | 결과 | 범위 |
| --- | --- | --- |
| 서버 자동 테스트 | 성공 13개 | 실제 준비 코드와 bcrypt 실행, 타이머가 없는 로컬 GAS/Sheets 어댑터 |
| bcrypt salt·해시·공개 필드 제한 | 성공 | 공개 응답에 비밀값 없음 |
| 등록 중복 방지·비밀번호 오류·삭제 확인·요청 제한 | 성공 | 로컬 서버 코드 실행 |
| 독립 클라이언트 조회·삭제, 세션 갱신 | 성공 | 브라우저 저장소를 공유하지 않는 Chromium 컨텍스트 |
| 320px / 390px 중첩 iframe 통신 | 성공 | 실제 Bridge 소스를 사용하는 로컬 Google 호스트 모사 |
| 잘못된 postMessage 출처·창 거절 | 성공 | Chromium 모사 환경 |
| 실제 Google 시트 등록·조회·삭제 | **사용자 실행 로그로 통과 확인** | 소유자 서버 자체 점검 5개 항목 true, 직접 재실행은 미검증 |
| 제공된 실제 웹앱 응답·익명 접속 | **미검증** | 현재 실행 환경의 script.google.com 연결 정책으로 접근 불가 |
| 실제 Pages ↔ Google 브라우저 통신 | **미검증** | 실제 웹앱으로 최종 연결 필요 |
| 신규 방명록 UI·키보드·프레임 정렬 | **미검증 / 미구현** | 서버 준비 단계로 범위 제한 |

환경의 프록시 CONNECT가 403으로 연결을 거절한 것이며, Google 웹앱 자체에서 HTTP 403을 받았다는 뜻이 아닙니다. Google 데이터 변경 요청은 전송하지 않았습니다. 모사 브라우저 테스트 스크린샷에는 실제 Google 저장 검증이 아니라는 안내를 표시했습니다.

서버 테스트 실행: `node tests/guestbook-server.test.mjs` 또는 기존 `npm test`. 로컬 어댑터는 `tests/helpers/guestbook-gas-harness.mjs`이며 실제 Google 네트워크나 저장소를 사용하지 않습니다.

## 공식 근거

- [웹앱 실행 주체·공개 권한·배포](https://developers.google.com/apps-script/guides/web)
- [google.script.run와 비공개 함수 규칙](https://developers.google.com/apps-script/guides/html/communication)
- [HtmlService iframe 제약](https://developers.google.com/apps-script/guides/html/restrictions)
- [ALLOWALL 설정과 개발자 책임](https://developers.google.com/apps-script/reference/html/x-frame-options-mode)
- [ContentService 리다이렉트와 JSONP 보안 주의](https://developers.google.com/apps-script/guides/content)
- [Apps Script 무료 계정 할당량 및 변경 가능성](https://developers.google.com/apps-script/guides/services/quotas)
- [Utilities UUID·HMAC API](https://developers.google.com/apps-script/reference/utilities/utilities)
