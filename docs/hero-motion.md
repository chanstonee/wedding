# 히어로 커플 SVG 모션

## 원본 구조와 보존 범위

저장소의 `public/assets/invitation/section-0-img.svg`는 326 × 272.315
viewBox의 벡터입니다. 2개 그룹 안에 314개 path가 있으며, 이미지 태그는 없습니다.
원본 파일에는 Male/Female/Dress/Hair처럼 의미가 있는 레이어 이름이 없습니다.
이는 저장소에 있는 SVG의 분석 결과이며, 원본 Figma 편집 파일을 확인한 것은 아닙니다.

`app/lib/hero-couple-paths.json`은 원본의 모든 path 속성을 같은 순서로 옮긴
데이터입니다. 원본 SVG 파일은 그대로 보존합니다. 경로 좌표, 색상, fill-opacity,
fill-rule, clip-rule, 전체 그림의 0.8 opacity와 별의 별도 opacity를 유지합니다.
정지 상태를 동일한 Chromium 렌더 조건으로 비교하면 픽셀 차이는 0입니다.

## SVG 및 HTML 구조

`app/components/HeroCouple.tsx`가 원본 path를 인라인 SVG로 렌더합니다.
경로 데이터나 그림을 새로 그리지 않고 그룹과 CSS transform만 추가합니다.

```tsx
<div className="inv-couple">
  <HeroCouple />
</div>
```

개념적인 SVG 구조는 다음과 같습니다. 실제 컴포넌트는 원래 그리기 순서를
지키기 위해 마지막 세부 경로의 Male/Female 그룹을 추가로 나눠 렌더합니다.

```xml
<svg viewBox="0 0 326 272.315" role="img">
  <g class="inv-couple-float">
    <g class="inv-couple-sway">
      <g opacity="0.8">
        <g data-part="Female"><!-- 원본 신부 / Hair / Dress 주름 --></g>
        <g data-part="Male"><!-- 원본 신랑 --></g>
        <g data-part="Decoration"><!-- 하트 --></g>
        <!-- 원래 맨 위에 그렸던 인물별 세부 경로 -->
      </g>
    </g>
  </g>
  <g data-part="Decoration"><!-- 별 --></g>
</svg>
```

## 적용한 모션

모든 반복은 CSS `ease-in-out`, 무한 반복입니다. CSS는
`app/invitation.css`의 `.inv-couple-*`와 동명 keyframes에 있습니다.
커튼을 열기 전에는 시작하지 않으며, 기존 1.4초 등장 모션 뒤에 이어집니다.
모든 회전은 중립 자세에서 시작하고 돌아오므로 시작과 반복 경계에서 튀지 않습니다.

| 대상 | 모션 | 주기 / 시작 지연 |
| --- | --- | --- |
| 커플 공통 | ±1.1° sway와 위쪽으로 최대 4 SVG 단위 float | 4.8초 / 1.5초 |
| Male | 손 연결점을 중심으로 ±0.22° | 4.8초 / 1.5초 |
| Female | 같은 연결점에서 반대 방향 ±0.28° | 4.8초 / 1.5초 |
| Dress | 독립된 내부 주름만 ±0.18° 후행 | 4.8초 / 1.74초 |
| Hair | 독립된 뒷머리와 해당 디테일만 ±0.32° 후행 | 4.8초 / 1.82초 |
| Decoration | 하트 최대 1.3 단위, 별 최대 0.8 단위 float | 각각 5.2초 / 5.6초 |

남녀의 회전 중심은 원본 좌표 `(181, 24)`로 같습니다. 두 회전을 독립적으로
적용해도 이 점은 같은 화면 좌표에 남습니다. 320px / 390px에서 실제 상하 이동
범위는 약 3.28px / 4px, 접촉부 주변 좌표 차이는 최대 약 0.046px / 0.056px입니다.
드레스 주름 중심은 `(216, 146)`, 뒷머리는 `(223, 64)`입니다.

## 구조상 한계

신부 몸통, 팔, 앞머리 일부와 드레스 외곽선은 하나의 연결된 경로에 섞여 있습니다.
그래서 드레스 전체 실루엣이나 앞머리를 몸통에서 잘라 별도로 흔들지 않습니다.
원본 연결 윤곽은 신부 그룹을 따라가고, 안전하게 구분되는 내부 주름과 뒷머리만
미세하게 후행합니다. 신랑의 머리도 몸체 윤곽과 연결돼 별도 분리하지 않았습니다.
전체 자락 변형이나 관절 수준의 춤은 원본 레이어 재구성이 필요합니다.

`prefers-reduced-motion: reduce`에서는 등장·반복 모션이 모두 비활성화되어
원본 정적 그림으로 표시됩니다. 미디어 파일, 새 영상, JS 애니메이션 루프나
외부 모션 라이브러리는 추가하지 않았습니다.

## 검증

- 원본 path 314개와 모든 속성, 렌더된 SVG의 경로 순서를 자동 테스트로 비교.
- 320px / 390px에서 각 41개 시점의 회전·이동·손 연결·반복 경계를 검사.
- 정지 그림 픽셀 일치, 실시간 CSS 모션, 모션 감소 설정 확인.
- 가로 넘침이나 그림 잘림, 이름과의 겹침 없음.
- 갤러리 +2 MORE / 사진 순환 / 닫기 및 BGM 연속 재생 확인.
- Pages 빌드와 타입 검사, lint, 기존 및 신규 자동 테스트 통과.

검증 자료는 `/workspace/wedding-hero-motion-verification/`에 있습니다.
`hero-couple-preview.svg`는 같은 경로와 CSS를 포함한 독립 실행 SVG 미리보기입니다.
`hero-motion.css`, 시점별 PNG, `results.json`, 정적 비교 화면과 Playwright trace도
같이 보관합니다. 실제 iOS Safari 및 실기기 프레임률은 미검증입니다.

현재 새 모션은 배포 전 검증 상태입니다. 앞서 승인된 갤러리 SVG와 칵테일 배치는
커밋 `fb2e57e325297f4432d28029c9e5754d2ea0e4c8`로 Pages 배포를 완료했습니다.
