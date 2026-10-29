"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";

import WeddingMusic, { type WeddingMusicHandle } from "./WeddingMusic";
import { galleryPhotoFiles, getGalleryPreview, getNextPhotoIndex } from "../lib/gallery.mjs";
import artwork from "../../figma-assets.json";

const artworkWidths = new Map(
  artwork.map(({ section, name, width }) => [
    `${section}-${name}`,
    Number(width ?? 0),
  ]),
);

const publicBasePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "";
const asset = (section: number, name = "img", extension = "svg") =>
  `${publicBasePath}/assets/invitation/section-${section}-${name}.${extension}`;
const photos = galleryPhotoFiles.map((path) => `${publicBasePath}/${path}`);
const previewPhotos = getGalleryPreview(photos);
const venue = "퍼스트가든 · 해피가든";
const address = "경기도 파주시 탑삭골길 260";
const accounts = [
  {
    person: "신부 유다연",
    bank: "신한은행",
    number: "110-000-000001",
    owner: "유다연",
  },
  {
    person: "신랑 주재훈",
    bank: "국민은행",
    number: "000000-00-000002",
    owner: "주재훈",
  },
];
const schedule = [
  ["18:00", "하객 맞이 · 기념사진"],
  ["18:30", "결혼식 시작"],
  ["19:00", "야외 저녁 식사"],
  ["19:30", "행복한 마무리"],
];
const maps = [
  {
    name: "네이버지도",
    detail: "지도에서 위치 확인",
    href: "https://naver.me/G6Rqydqw",
  },
  {
    name: "카카오지도",
    detail: "지도에서 위치 확인",
    href: `https://map.kakao.com/link/search/${encodeURIComponent(address + " 퍼스트가든")}`,
  },
  {
    name: "티맵",
    detail: "내비게이션 앱 실행",
    href: `https://www.tmap.co.kr/tmap2/mobile/route.jsp?name=${encodeURIComponent("퍼스트가든 해피가든")}&lon=126.7941923&lat=37.7316412`,
  },
];

function Art({
  section,
  name = "img",
  alt = "",
  className = "",
}: {
  section: number;
  name?: string;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Preserve native sizing and original asset URLs in the static Pages export.
    <img
      className={className}
      src={asset(section, name)}
      alt={alt}
      draggable={false}
      decoding="async"
    />
  );
}
function Decoration({
  section,
  name,
  x,
  y,
  rotate = 0,
  className = "",
}: {
  section: number;
  name: string;
  x: number;
  y: number;
  rotate?: number;
  className?: string;
}) {
  return (
    <span
      className={`inv-decoration ${className}`}
      style={
        {
          left: `${x / 3.9}%`,
          top: y,
          width: `calc(${artworkWidths.get(`${section}-${name}`)} * var(--inv-unit))`,
          "--art-rotate": `${rotate}deg`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span data-scroll-motion="decoration">
        <Art section={section} name={name} />
      </span>
    </span>
  );
}

// Cache geometry when layout changes; scroll events request a single animation frame.
function useScrollMotion(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let positions: {
      element: HTMLElement;
      center: number;
      timeline: boolean;
    }[] = [];
    const draw = () => {
      frame = 0;
      const center = window.scrollY + window.innerHeight * 0.5;
      const range = Math.max(1, window.innerHeight * 0.6);
      const timelineRange = Math.max(1, window.innerHeight * 0.3);
      for (const { element, center: itemCenter, timeline } of positions) {
        const progress = Math.max(0, 1 - Math.abs(itemCenter - center) / (timeline ? timelineRange : range));
        const eased = progress * progress * (3 - 2 * progress);
        element.style.setProperty(
          "--motion-scale",
          preference.matches
            ? "1"
            : String(timeline ? 0.76 + 0.42 * eased : 0.83 + 0.29 * eased),
        );
        element.style.setProperty(
          "--motion-opacity",
          preference.matches
            ? "1"
            : String(timeline ? 0.64 + 0.36 * eased : 0.65 + 0.35 * eased),
        );
      }
    };
    const requestDraw = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const measure = () => {
      positions = Array.from(
        container.querySelectorAll<HTMLElement>("[data-scroll-motion]"),
      ).map((element) => ({
        element,
        center:
          element.getBoundingClientRect().top +
          window.scrollY +
          element.getBoundingClientRect().height / 2,
        timeline: element.dataset.scrollMotion === "timeline",
      }));
      requestDraw();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    document.fonts.ready.then(measure);
    window.addEventListener("scroll", requestDraw, { passive: true });
    window.addEventListener("resize", measure);
    preference.addEventListener("change", requestDraw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", requestDraw);
      window.removeEventListener("resize", measure);
      preference.removeEventListener("change", requestDraw);
    };
  }, [root]);
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      /* Fall back when browser permissions deny Clipboard access. */
    }
  }
  const previous = document.activeElement as HTMLElement | null;
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
  (document.querySelector(".inv-dialog") ?? document.body).appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  previous?.focus({ preventScroll: true });
  if (!copied) throw new Error("Copy failed");
}

function Dialog({
  title,
  onClose,
  children,
  className = "",
  onArrow,
  returnFocus,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  onArrow?: (direction: number) => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef<HTMLButtonElement>(null),
    arrow = useRef(onArrow);
  useEffect(() => {
    arrow.current = onArrow;
  }, [onArrow]);
  useEffect(() => {
    const previous = returnFocus.current;
    close.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowLeft") arrow.current?.(-1);
      if (event.key === "ArrowRight") arrow.current?.(1);
      if (event.key !== "Tab" || !ref.current) return;
      const controls = Array.from(
        ref.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !ref.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !ref.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      requestAnimationFrame(() => previous?.focus({ preventScroll: true }));
    };
  }, [onClose, returnFocus]);
  return (
    <div
      className={`inv-overlay ${className}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="inv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-dialog-title"
      >
        <header className="inv-dialog-heading">
          <h2 id="inv-dialog-title">{title}</h2>
          <button
            ref={close}
            className="inv-close"
            onClick={onClose}
            aria-label={`${title} 닫기`}
          >
            <Art section={9} name="imgIcon1" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

// The reference mobile ribbon travels 712px in 11s at its 320px design width.
const referenceRibbonSpeed = 712 / 11;
function DateMarquee() {
  const ribbon = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(18);
  useEffect(() => {
    let active = true;
    const measure = () => {
      const paperWidth = ribbon.current?.closest(".inv-paper")?.clientWidth ?? 320;
      const width = group.current?.scrollWidth;
      if (active && width) setDuration(width / (referenceRibbonSpeed * paperWidth / 320));
    };
    const observer = new ResizeObserver(measure);
    if (ribbon.current) observer.observe(ribbon.current);
    if (group.current) observer.observe(group.current);
    void document.fonts.ready.then(measure);
    return () => { active = false; observer.disconnect(); };
  }, []);
  return (
    <div className="inv-date-tape" ref={ribbon} aria-hidden="true">
      <div className="inv-tape-track" style={{ "--inv-marquee-duration": `${duration}s` } as CSSProperties}>
        {[0, 1].map((copy) => (
          <div className="inv-tape-group" key={copy} ref={copy === 0 ? group : undefined}>
            {Array.from({ length: 10 }, (_, index) => (
              <span key={index}>2027. 05. 15 · 다연 &amp; 재훈</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Curtain({
  opening,
  onOpen,
}: {
  opening: boolean;
  onOpen: () => void;
}) {
  return (
    <div className={`inv-curtain ${opening ? "is-opening" : ""}`}>
      {["left", "right"].map((side) => (
        <div key={side} className={`inv-curtain-panel inv-curtain-${side}`} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- Keep the curtain's existing cover sizing and static asset URL. */}
          <img src={`${publicBasePath}/assets/invitation/curtain.png`} alt="" width="359" height="594" />
        </div>
      ))}
      <button
        className="inv-curtain-open"
        onClick={onOpen}
        disabled={opening}
        aria-label="초대장 열기"
      >
        <span className="inv-curtain-copy">
          <span className="inv-curtain-seal">저를<br />눌러주세요!</span>
        </span>
      </button>
    </div>
  );
}

export default function Invitation() {
  const music = useRef<WeddingMusicHandle>(null);
  const main = useRef<HTMLElement>(null),
    heroTitle = useRef<HTMLHeadingElement>(null);
  const [gate, setGate] = useState<"closed" | "opening" | "open">("closed");
  const [modal, setModal] = useState<"map" | "gallery" | "rsvp" | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0),
    [expanded, setExpanded] = useState<number | null>(null);
  const [toast, setToast] = useState(""),
    [attendance, setAttendance] = useState("yes"),
    [guestName, setGuestName] = useState("");
  const swipeStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
    maxY: number;
  } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openModal = (type: "map" | "gallery" | "rsvp") => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setModal(type);
  };
  const closeModal = useCallback(() => setModal(null), []);
  useScrollMotion(main);
  useEffect(() => {
    if (gate !== "opening") return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? 160
      : 1600;
    const timer = window.setTimeout(() => {
      setGate("open");
    }, duration);
    return () => window.clearTimeout(timer);
  }, [gate]);
  useEffect(() => {
    if (gate === "open") heroTitle.current?.focus({ preventScroll: true });
  }, [gate]);
  useEffect(() => {
    if (gate === "open" && !modal) return;
    const html = document.documentElement.style.overflow,
      body = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = html;
      document.body.style.overflow = body;
    };
  }, [gate, modal]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const copy = async (value: string, success: string) => {
    try {
      await copyText(value);
      setToast(success);
    } catch {
      setToast("복사할 수 없습니다. 내용을 길게 눌러 복사해 주세요.");
    }
  };
  const response = `재훈 & 다연 결혼식 참석 여부\n성함: ${guestName.trim()}\n${attendance === "yes" ? "참석할게요." : "아쉽지만 참석이 어려워요."}\n2027년 5월 15일 · ${venue}`;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guestName.trim()) openModal("rsvp");
  };
  const changePhoto = (direction: number) =>
    setPhotoIndex((index) => getNextPhotoIndex(index, direction, photos.length));
  const shareResponse = async () => {
    if (!navigator.share) {
      await copy(
        response,
        "참석 응답을 복사했어요. 신랑·신부에게 보내 주세요.",
      );
      return;
    }
    try {
      await navigator.share({ title: "결혼식 참석 여부", text: response });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setToast("공유할 수 없습니다. 내용 복사를 이용해 주세요.");
    }
  };
  return (
    <div
      className={`wedding-invitation ${gate !== "closed" ? "is-revealed" : ""}`}
    >
      <main
        ref={main}
        className="inv-paper"
        inert={gate !== "open" || modal !== null}
      >
        <section
          className="inv-section inv-hero"
          aria-label="재훈과 다연의 결혼식"
        >
          <DateMarquee />
          <Decoration section={0} name="imgImage" x={329.5} y={145} />
          <Decoration section={0} name="imgImage1" x={304.4} y={505} />
          <Decoration section={0} name="imgImage2" x={306.7} y={182} />
          <Decoration section={0} name="imgImage3" x={54.5} y={172} />
          <Decoration section={0} name="imgImage4" x={43.4} y={500} />
          <Decoration section={0} name="imgImage5" x={85.4} y={19.3} />
          <Decoration section={0} name="imgImage6" x={286.2} y={218.3} />
          <div className="inv-hero-wordmark">
            <Art section={0} name="imgGroup2" alt="사랑을 담아!" />
          </div>
          <div className="inv-couple">
            <Art section={0} alt="손을 맞잡고 춤추는 신랑과 신부" />
          </div>
          <h1 ref={heroTitle} tabIndex={-1}>
            재훈 & 다연
          </h1>
          <div className="inv-hero-date">
            <Art section={0} name="imgImage7" />
            <time dateTime="2027-05-15">2027. 05. 15</time>
          </div>
        </section>
        <section
          className="inv-section inv-message"
          aria-labelledby="message-title"
        >
          <Decoration
            section={1}
            name="imgImage"
            x={322}
            y={96}
            rotate={12.06}
          />
          <Decoration
            section={1}
            name="imgTSvgc905Ec816B"
            x={25}
            y={278}
            rotate={9.41}
          />
          <h2 id="message-title">
            사랑하는 가족과
            <br />
            소중한 분들께!
          </h2>
          <div className="inv-message-copy">
            <p>올해 저희에게 아주 특별한 하루가 찾아옵니다.</p>
            <p>
              그날을 여러분 없이 맞이한다는 것은 상상할 수 없기에, 저희의
              결혼식에 소중한 여러분을 기쁜 마음으로 초대합니다.
            </p>
          </div>
        </section>
        <section className="inv-section inv-date" aria-labelledby="date-title">
          <h2 id="date-title">날짜 안내</h2>
          <p>달력에 꼭 표시해 주세요!</p>
          <div className="inv-calendar" aria-label="2027년 5월 15일 토요일">
            <Art section={2} name="imgImage" className="inv-calendar-marker" />
            <div className="inv-calendar-days" aria-hidden="true">
              {["목", "금", "토", "일", "월"].map((day) => (
                <b key={day}>{day}</b>
              ))}
            </div>
            <div className="inv-calendar-numbers" aria-hidden="true">
              {[13, 14, 15, 16, 17].map((day) => (
                <span className={day === 15 ? "is-wedding-day" : ""} key={day}>
                  {day}
                </span>
              ))}
            </div>
          </div>
          <p className="inv-date-description">
            <time dateTime="2027-05-15T18:30:00+09:00">
              2027년 5월 15일 토요일
            </time>
            <span className="inv-date-message">
              따뜻하고 아름다운,
              <br />
              그리고 마음이 뭉클해지는
              <br />
              하루가 될 거예요.
            </span>
            <span className="inv-date-message">
              오래도록 몇 번이고
              <br />
              다시 떠올리고 싶은
              <br />
              저녁을 약속할게요!
            </span>
          </p>
        </section>
        <section
          className="inv-section inv-venue"
          aria-labelledby="venue-title"
        >
          <p className="inv-caption">저희가 여러분을 기다릴 곳은..</p>
          <h2 id="venue-title">
            퍼스트가든,
            <br />
            해피가든
          </h2>
          <Decoration section={3} name="imgImage" x={266} y={98} />
          <div className="inv-address">
            <Art section={3} name="imgImage1" />
            <p>
              {address},<br />
              해피가든
            </p>
          </div>
          <button
            className="inv-double-button"
            onClick={() => openModal("map")}
          >
            지도 바로가기
          </button>
        </section>
        <section
          className="inv-section inv-timeline"
          aria-labelledby="timeline-title"
        >
          <h2 id="timeline-title">타임테이블</h2>
          <div className="inv-timeline-art" aria-hidden="true">
            <Art section={4} />
          </div>
          <Decoration section={4} name="imgImage" x={330.8} y={326.8} />
          <Decoration section={4} name="imgImage1" x={323.1} y={523.4} />
          <Decoration
            section={4}
            name="imgImage2"
            x={18.3}
            y={555.3}
            rotate={0.28}
          />
          <Decoration section={4} name="imgImage3" x={30.4} y={385} />
          <ol className="inv-schedule">
            {schedule.map(([time, label]) => (
              <li data-scroll-motion="timeline" key={time}>
                <time dateTime={`2027-05-15T${time}:00+09:00`}>{time}</time>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </section>
        <section
          className="inv-section inv-gallery"
          aria-labelledby="gallery-title"
        >
          <div className="inv-gallery-border" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- Keep the supplied frame at its original aspect ratio. */}
            <img
              src={`${publicBasePath}/assets/invitation/gallery-frame.jpg`}
              alt=""
              width={720}
              height={1280}
              draggable={false}
              decoding="async"
            />
          </div>
          <h2 id="gallery-title">우리의 웨딩스냅</h2>
          <p>
            함께 웃고, 서로를 바라보며
            <br />
            기억에 담아둔 우리의 순간들.
          </p>
          <div className="inv-photo-grid">
            {previewPhotos.map(({ src, index, moreCount }) => (
              <button
                key={src}
                type="button"
                onClick={() => {
                  setPhotoIndex(index);
                  openModal("gallery");
                }}
                aria-label={moreCount > 0 ? `웨딩스냅 ${moreCount}장 더보기` : `웨딩스냅 ${index + 1} 크게 보기`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Keep native photo sizing and lazy loading in the static export. */}
                <img
                  src={src}
                  alt={`재훈과 다연의 웨딩스냅 ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                />
                {moreCount > 0 && (
                  <span className="inv-photo-more-overlay" aria-hidden="true">
                    <strong>+{moreCount}</strong>
                    <span>MORE</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
        <section
          className="inv-section inv-gifts"
          aria-labelledby="gifts-title"
        >
          <Decoration
            section={6}
            name="imgImage"
            x={0}
            y={497}
            className="inv-gifts-angel"
          />
          <Decoration section={6} name="imgImage1" x={242} y={31} />
          <Decoration section={6} name="imgTSvgaa6987Cf8C" x={166} y={99} />
          <Decoration section={6} name="imgTSvg8B3E597E9F" x={42} y={61} />
          <Decoration section={6} name="imgTSvg67E12F3A5A" x={69} y={220} />
          <Decoration section={6} name="imgTSvg67E12F3A5A" x={288} y={546} />
          <Decoration section={6} name="imgTSvg77C6F6B0Ef" x={331} y={283} />
          <Decoration section={6} name="imgTSvg120C2B0F343" x={333} y={210} />
          <Decoration section={6} name="imgTSvg120C2B0F343" x={124} y={492} />
          <Decoration section={6} name="imgVector" x={143} y={608} />
          <Decoration section={6} name="imgTSvgb6A778D045" x={280} y={16} />
          <div className="inv-gifts-intro">
            <h2 id="gifts-title">마음 전하실 곳</h2>
            <p>
              축복의 마음을 전해 주시는
              <br />
              모든 분께 감사드립니다.
            </p>
          </div>
          <div className="inv-accounts">
            {accounts.map((account, index) => (
              <div
                key={account.owner}
                className={`inv-account ${expanded === index ? "is-expanded" : ""}`}
              >
                <h3>
                  <button
                    className="inv-account-toggle"
                    aria-expanded={expanded === index}
                    aria-controls={`account-${index}`}
                    onClick={() =>
                      setExpanded(expanded === index ? null : index)
                    }
                  >
                    <span>{account.person}</span>
                    <Art section={6} className="inv-plus" />
                  </button>
                </h3>
                <div
                  className="inv-account-collapse"
                  id={`account-${index}`}
                  inert={expanded !== index}
                >
                  <div>
                    <div className="inv-account-details">
                      <p className="inv-caption">{account.bank}</p>
                      <p className="inv-account-number">{account.number}</p>
                      <p>예금주 {account.owner}</p>
                      <button
                        className="inv-copy-button"
                        onClick={() =>
                          copy(
                            account.number,
                            `${account.owner} 님의 계좌번호를 복사했어요.`,
                          )
                        }
                      >
                        <Art section={6} name="imgIcon" />
                        계좌번호 복사
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <p className="inv-account-example">
              계좌번호는 디자인 확인용 예시입니다.
            </p>
          </div>
        </section>
        <section className="inv-section inv-rsvp" aria-labelledby="rsvp-title">
          <div className="inv-rsvp-frame">
            <Art section={7} name="imgVector" className="inv-rsvp-border" />
            <span className="inv-rsvp-bow" aria-hidden="true">
              <Art section={7} name="imgImage1" />
            </span>
            <span
              className="inv-rsvp-wine"
              aria-hidden="true"
              data-scroll-motion="decoration"
            >
              <Art section={7} name="imgImage" />
            </span>
            <span className="inv-rsvp-flower" aria-hidden="true">
              <Art section={7} name="imgImage2" />
            </span>
            <div className="inv-rsvp-content">
              <h2 id="rsvp-title">
                저희와 함께해
                <br />
                주실 수 있나요?
              </h2>
              <p>
                원활한 예식 준비를 위해 참석 여부를
                <br />
                알려주시면 감사하겠습니다.
              </p>
              <form onSubmit={submit}>
                <fieldset>
                  <legend>참석 여부</legend>
                  {[
                    ["yes", "참석할게요."],
                    ["no", "아쉽지만 참석이 어려워요."],
                  ].map(([value, label]) => (
                    <label className="inv-radio" key={value}>
                      <input
                        type="radio"
                        name="attendance"
                        value={value}
                        checked={attendance === value}
                        onChange={() => setAttendance(value)}
                      />
                      <Art
                        section={7}
                        name={attendance === value ? "imgFrame25" : "img"}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
                <label className="inv-name-label" htmlFor="guest-name">
                  성함을 입력해 주세요.
                </label>
                <input
                  className="inv-name-input"
                  id="guest-name"
                  name="guestName"
                  autoComplete="name"
                  placeholder="성함"
                  value={guestName}
                  maxLength={100}
                  required
                  onChange={(event) => setGuestName(event.target.value)}
                  pattern=".*\S.*"
                />
                <p className="inv-caption inv-rsvp-note">
                  참석하시는 모든 분의 성함을 입력해 주세요.
                </p>
                <button type="submit" className="inv-double-button">
                  참석 여부 전달하기
                </button>
              </form>
            </div>
          </div>
        </section>
        <section
          className="inv-section inv-ending"
          aria-labelledby="ending-title"
        >
          <div className="inv-garland" aria-hidden="true">
            <Art section={8} name="imgImage6" />
          </div>
          <Decoration section={8} name="imgImage" x={25} y={52} />
          <Decoration section={8} name="imgImage1" x={343} y={160} />
          <Decoration section={8} name="imgImage2" x={16} y={260} />
          <Decoration section={8} name="imgImage3" x={315} y={43} />
          <Decoration section={8} name="imgImage4" x={188} y={18} />
          <Decoration section={8} name="imgTSvg1045Ea565E2" x={319} y={299} />
          <Decoration section={8} name="imgTSvg31Ea7Bf341" x={68} y={315} />
          <h2 id="ending-title">
            소중한 여러분을
            <br />
            기다립니다!
          </h2>
          <p>저희의 특별한 하루에 함께해 주셔서 감사합니다.</p>
          <h2>다연 & 재훈</h2>
          <div className="inv-ending-date">
            <time dateTime="2027-05-15">2027. 05. 15</time>
          </div>
          <div className="inv-dinner">
            <Art
              section={8}
              name="imgImage5"
              alt="꽃과 촛불로 장식한 웨딩 테이블"
            />
          </div>
        </section>
      </main>
      <WeddingMusic ref={music} visible={gate !== "closed" && modal === null} />
      {gate !== "open" && (
        <Curtain
          opening={gate === "opening"}
          onOpen={() => {
            music.current?.start();
            window.scrollTo(0, 0);
            setGate("opening");
          }}
        />
      )}
      {modal === "map" && (
        <Dialog
          title="길 안내"
          onClose={closeModal}
          returnFocus={returnFocus}
          className="inv-map-overlay"
        >
          <p className="inv-caption">이용하실 지도를 선택해 주세요.</p>
          <div className="inv-map-address">
            <p>{venue}</p>
            <p className="inv-caption">{address}</p>
          </div>
          <div className="inv-map-options">
            {maps.map((map) => (
              <a
                key={map.name}
                href={map.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  <strong>{map.name}</strong>
                  <small>{map.detail}</small>
                </span>
                <Art section={9} name="imgIcon" />
              </a>
            ))}
          </div>
        </Dialog>
      )}
      {modal === "gallery" && (
        <Dialog
          title="웨딩스냅"
          onClose={closeModal}
          returnFocus={returnFocus}
          className="inv-lightbox"
          onArrow={changePhoto}
        >
          <div
            className="inv-lightbox-image"
            onPointerDown={(event) => {
              if (event.pointerType !== "touch" || !event.isPrimary) {
                swipeStart.current = null;
                return;
              }
              swipeStart.current = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                maxY: 0,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = swipeStart.current;
              if (!start || start.pointerId !== event.pointerId) return;
              start.maxY = Math.max(start.maxY, Math.abs(event.clientY - start.y));
            }}
            onPointerUp={(event) => {
              const start = swipeStart.current;
              if (!start || start.pointerId !== event.pointerId) return;
              swipeStart.current = null;
              const dx = event.clientX - start.x;
              const dy = Math.max(start.maxY, Math.abs(event.clientY - start.y));
              // Ignore taps, vertical/diagonal paths, and vertical detours.
              if (Math.abs(dx) > 50 && Math.abs(dx) > dy * 1.5)
                changePhoto(dx < 0 ? 1 : -1);
            }}
            onPointerCancel={() => {
              swipeStart.current = null;
            }}
            onLostPointerCapture={() => {
              swipeStart.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- The lightbox uses native image dimensions with viewport-constrained CSS. */}
            <img src={photos[photoIndex]} alt={`재훈과 다연의 웨딩스냅 ${photoIndex + 1}`} />
          </div>
          <div className="inv-lightbox-nav">
            <button onClick={() => changePhoto(-1)} aria-label="이전 사진">
              ←
            </button>
            <span aria-live="polite">{photoIndex + 1} / {photos.length}</span>
            <button onClick={() => changePhoto(1)} aria-label="다음 사진">
              →
            </button>
          </div>
        </Dialog>
      )}
      {modal === "rsvp" && (
        <Dialog
          title="참석 여부 전달"
          onClose={closeModal}
          returnFocus={returnFocus}
        >
          <p>아래 내용을 신랑·신부에게 보내 주세요.</p>
          <div className="inv-response">
            <p>{guestName.trim()}</p>
            <p>
              {attendance === "yes"
                ? "참석할게요."
                : "아쉽지만 참석이 어려워요."}
            </p>
            <p className="inv-caption">2027. 05. 15 · {venue}</p>
          </div>
          <div className="inv-response-actions">
            <button className="inv-double-button" onClick={shareResponse}>
              공유하기
            </button>
            <button
              className="inv-copy-button"
              onClick={() =>
                copy(
                  response,
                  "참석 응답을 복사했어요. 신랑·신부에게 보내 주세요.",
                )
              }
            >
              내용 복사
            </button>
          </div>
          <p className="inv-caption">
            공유 또는 복사한 내용을 보내야 전달됩니다.
          </p>
        </Dialog>
      )}
      <div
        className={`inv-toast ${toast ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </div>
  );
}
