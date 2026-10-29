"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { createGuestbookClient, GuestbookError } from "../lib/guestbook-client.mjs";

const base = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "";
type Entry = { id: string; name: string; message: string; createdAt: string };
type Page = { entries: Entry[]; nextCursor: string | null };
type Client = ReturnType<typeof createGuestbookClient>;
const count = (value: string) => Array.from(value).length;
const date = (value: string) => new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(value));
function errorMessage(error: unknown) {
  return error instanceof GuestbookError ? error.message : "방명록에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function GuestbookModal({ title, busy, close, children }: {
  title: string; busy: boolean; close: () => void; children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(busy);
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const scrollY = window.scrollY;
    closeButton.current?.focus({ preventScroll: true });
    const resize = () => {
      const view = window.visualViewport;
      if (view) setViewport({ height: view.height, top: view.offsetTop });
    };
    resize();
    window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", resize);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); close(); }
      if (event.key !== "Tab" || !panel.current) return;
      const elements = Array.from(panel.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled):not([tabindex="-1"]), textarea:not(:disabled), a[href]',
      )).filter((element) => element.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      window.visualViewport?.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("scroll", resize);
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
        previous?.focus({ preventScroll: true });
      });
    };
  }, [close]);
  const root = document.querySelector(".wedding-invitation");
  if (!root) return null;
  return createPortal(
    <div className="gb-overlay" style={viewport ? { height: viewport.height, top: viewport.top } : undefined}
      onClick={(event) => { if (event.target === event.currentTarget && !busy) close(); }}>
      <div className="gb-dialog" role="dialog" aria-modal="true" aria-labelledby="gb-dialog-title" ref={panel}>
        <header className="gb-dialog-header">
          <h2 id="gb-dialog-title">{title}</h2>
          <button ref={closeButton} className="gb-close" type="button" onClick={close} disabled={busy} aria-label={`${title} 닫기`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Reuse the invitation's existing icon. */}
            <img src={`${base}/assets/invitation/section-9-imgIcon1.svg`} alt="" width="20" height="20" />
          </button>
        </header>
        {children}
      </div>
    </div>, root,
  );
}

function MessageCard({ entry }: { entry?: Entry }) {
  const message = useRef<HTMLParagraphElement>(null);
  const [scroll, setScroll] = useState({ visible: false, height: 100, top: 0 });
  const measure = useCallback(() => {
    const element = message.current;
    if (!element) return;
    const visible = element.scrollHeight > element.clientHeight + 1;
    const height = visible ? Math.max(18, element.clientHeight / element.scrollHeight * 100) : 100;
    const top = visible ? element.scrollTop / (element.scrollHeight - element.clientHeight) * (100 - height) : 0;
    setScroll((previous) => previous.visible === visible && Math.abs(previous.height - height) < .1 && Math.abs(previous.top - top) < .1
      ? previous : { visible, height, top });
  }, []);
  useEffect(() => {
    const element = message.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    void document.fonts.ready.then(measure);
    measure();
    return () => observer.disconnect();
  }, [entry, measure]);
  return (
    <div className="gb-card">
      {/* eslint-disable-next-line @next/next/no-img-element -- Preserve the supplied PNG without cropping or distortion. */}
      <img className="gb-frame" src={`${base}/assets/invitation/guestbook-frame.png`} width="1254" height="1254" alt="" draggable={false} />
      <div className="gb-card-text">
        {entry ? <>
          <p className={`gb-author${count(entry.name) > 10 ? " gb-author-long" : ""}`}>From. {entry.name}</p>
          <div className={`gb-message-region${scroll.visible ? " is-scrollable" : ""}`}>
            <p ref={message} className="gb-message" onScroll={measure} tabIndex={scroll.visible ? 0 : undefined} aria-label={scroll.visible ? "스크롤 가능한 축하 메시지" : undefined}>{entry.message}</p>
            {scroll.visible && <span className="gb-scroll-track" aria-hidden="true"><span style={{ height: `${scroll.height}%`, top: `${scroll.top}%` }} /></span>}
          </div>
          <time className="gb-date" dateTime={entry.createdAt}>{date(entry.createdAt)}</time>
        </> : <p className="gb-empty">첫 번째 축하의 마음을<br />남겨주세요.</p>}
      </div>
    </div>
  );
}

export default function Guestbook({ enabled, onModalChange, onNotice }: {
  enabled: boolean; onModalChange: (open: boolean) => void; onNotice: (text: string) => void;
}) {
  const section = useRef<HTMLElement>(null);
  const client = useRef<Client | null>(null);
  const generation = useRef(0), reading = useRef(false), submitting = useRef(false);
  const request = useRef<{ key: string; id: string } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]), [index, setIndex] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false), [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"write" | Entry | null>(null);
  const [busy, setBusy] = useState(false), [formError, setFormError] = useState("");
  const [name, setName] = useState(""), [password, setPassword] = useState(""), [text, setText] = useState(""), [website, setWebsite] = useState("");
  const start = useRef<{ id: number; x: number; y: number; maxY: number } | null>(null);
  const getClient = useCallback(() => (client.current ??= createGuestbookClient()), []);
  const load = useCallback(async () => {
    if (reading.current) return;
    reading.current = true;
    const run = generation.current;
    setLoading(true); setError("");
    try {
      const page = await getClient().list() as Page;
      if (run !== generation.current) return;
      setEntries(page.entries); setCursor(page.nextCursor); setIndex(0); setLoaded(true);
    } catch (error) { if (run === generation.current) setError(errorMessage(error)); }
    finally { if (run === generation.current) { reading.current = false; setLoading(false); } }
  }, [getClient]);
  useEffect(() => {
    if (!enabled || !section.current) return;
    const observer = new IntersectionObserver((items) => {
      if (items.some((item) => item.isIntersecting)) { void load(); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, [enabled, load]);
  useEffect(() => () => {
    generation.current++; reading.current = false;
    client.current?.destroy(); client.current = null;
  }, []);
  const open = (value: "write" | Entry) => { setFormError(""); setPassword(""); setModal(value); onModalChange(true); };
  const close = useCallback(() => {
    if (submitting.current) return;
    setPassword(""); request.current = null; setModal(null); onModalChange(false);
  }, [onModalChange]);
  const change = async (direction: number) => {
    if (!entries.length || reading.current) return;
    if (direction < 0) { setIndex((value) => Math.max(0, value - 1)); return; }
    if (index < entries.length - 1) { setIndex((value) => value + 1); return; }
    if (!cursor) return;
    reading.current = true; setLoading(true); setError("");
    try {
      const next = await getClient().list(cursor) as Page;
      const additional = next.entries.filter((entry) => !entries.some((old) => old.id === entry.id));
      setEntries((current) => [...current, ...additional]); setCursor(next.nextCursor);
      if (additional.length) setIndex(entries.length);
    } catch (error) { setError(errorMessage(error)); }
    finally { reading.current = false; setLoading(false); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || !modal) return;
    if (!password.trim() || count(password) < 4 || count(password) > 64) { setFormError("비밀번호는 4자 이상 64자 이하로 입력해 주세요."); return; }
    if (modal === "write" && (!name.trim() || count(name.trim()) > 20 || !text.trim() || count(text.trim()) > 100)) {
      setFormError("이름은 20자, 축하 메시지는 100자 이내로 입력해 주세요."); return;
    }
    submitting.current = true; setBusy(true); setFormError("");
    try {
      if (modal === "write") {
        const fields = { name: name.trim(), message: text.trim(), password, website };
        const key = JSON.stringify(fields);
        if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
        let result: Entry;
        try { result = await getClient().create(fields, request.current.id) as Entry; }
        catch (error) {
          if (!(error instanceof GuestbookError) || error.code !== "TOO_FAST") throw error;
          await new Promise((resolve) => window.setTimeout(resolve, 3000));
          result = await getClient().create(fields, request.current.id) as Entry;
        }
        setEntries((old) => [result, ...old.filter((item) => item.id !== result.id)]); setIndex(0); setLoaded(true); setError("");
        setName(""); setText(""); setWebsite(""); onNotice("축하 메시지가 등록되었습니다.");
      } else {
        await getClient().delete(modal.id, password, true);
        setEntries((old) => old.filter((item) => item.id !== modal.id));
        setIndex((current) => Math.max(0, Math.min(current, entries.length - 2)));
        onNotice("메시지가 삭제되었습니다.");
      }
      submitting.current = false; close();
    } catch (error) { setFormError(errorMessage(error)); }
    finally { submitting.current = false; setBusy(false); }
  };
  const current = entries[index];
  return (
    <section className="inv-section inv-guestbook" aria-labelledby="guestbook-title" ref={section}>
      <h2 id="guestbook-title">GUEST BOOK</h2>
      <p className="gb-description">두 사람의 새로운 시작에<br />따뜻한 축하의 마음을 남겨주세요.</p>
      <div className={`gb-carousel${entries.length > 1 ? " is-multiple" : ""}`} role="region" aria-roledescription="캐러셀" aria-label="축하 메시지"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, maxY: 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => { const point = start.current; if (point?.id === event.pointerId) point.maxY = Math.max(point.maxY, Math.abs(event.clientY - point.y)); }}
        onPointerUp={(event) => {
          const point = start.current; start.current = null;
          if (!point || point.id !== event.pointerId) return;
          const dx = event.clientX - point.x, dy = Math.max(point.maxY, Math.abs(event.clientY - point.y));
          if (Math.abs(dx) >= 45 && Math.abs(dx) > dy * 1.6) void change(dx < 0 ? 1 : -1);
        }} onPointerCancel={() => { start.current = null; }}>
        <div className="gb-track" style={{ transform: entries.length > 1 ? `translateX(calc(${6 - index * 88}% + ${index * 12}px))` : "translateX(0)" }}>
          {entries.length ? entries.map((entry, position) => <div className="gb-slide" key={entry.id} inert={position !== index} aria-hidden={position !== index}>
            <MessageCard entry={entry} />
          </div>) : <div className="gb-slide"><MessageCard /></div>}
        </div>
      </div>
      {entries.length > 1 && <div className="gb-pagination">
        <button type="button" disabled={index === 0 || loading} onClick={() => void change(-1)} aria-label="이전 메시지">
          {/* eslint-disable-next-line @next/next/no-img-element -- Reuse the gallery arrow. */}
          <img src={`${base}/assets/invitation/section-9-imgIcon.svg`} alt="" width="20" height="20" />
        </button>
        <p aria-live="polite" aria-atomic="true">{index + 1} / {entries.length}{cursor ? "+" : ""}</p>
        <button type="button" disabled={(!cursor && index === entries.length - 1) || loading} onClick={() => void change(1)} aria-label="다음 메시지">
          {/* eslint-disable-next-line @next/next/no-img-element -- Reuse the gallery arrow. */}
          <img src={`${base}/assets/invitation/section-9-imgIcon.svg`} alt="" width="20" height="20" />
        </button>
      </div>}
      {loading && <p className="gb-status" role="status">축하의 마음을 불러오고 있어요.</p>}
      {error && <div className="gb-status"><p role="alert">{error}</p><button className="inv-cta" type="button" onClick={() => void load()} disabled={loading}>다시 불러오기</button></div>}
      {loaded && !entries.length && !loading && <p className="gb-status">아직 등록된 메시지가 없습니다.</p>}
      {current && <button className="gb-delete inv-cta" type="button" onClick={() => open(current)} aria-label={`${current.name}님의 메시지 삭제`}>메시지 삭제</button>}
      <button className="gb-write inv-cta inv-cta--blue" type="button" onClick={() => open("write")}>축하 메시지 남기기</button>
      {modal && <GuestbookModal title={modal === "write" ? "축하 메시지 남기기" : "메시지 삭제"} busy={busy} close={close}>
        <form onSubmit={submit} className="gb-form" aria-busy={busy}>
          {modal === "write" ? <>
            <label htmlFor="gb-name">이름 <span className="gb-field-help">최대 20자</span></label>
            <input id="gb-name" name="name" placeholder="이름을 입력해 주세요." required maxLength={40} autoComplete="name" value={name} disabled={busy} onChange={(event) => setName(Array.from(event.target.value).slice(0, 20).join(""))} />
          </> : <p>이 메시지를 삭제할까요?<br />작성할 때 설정한 비밀번호를 입력해 주세요.</p>}
          <label htmlFor="gb-password">비밀번호</label>
          <input id="gb-password" name="password" type="password" required minLength={4} maxLength={128} autoComplete={modal === "write" ? "new-password" : "off"} placeholder="4자 이상의 비밀번호" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} aria-describedby="gb-password-help" />
          <p id="gb-password-help" className="gb-field-help">{modal === "write" ? "메시지 삭제 시 필요합니다. 다른 서비스의 비밀번호는 사용하지 마세요." : "삭제한 메시지는 복구할 수 없습니다."}</p>
          {modal === "write" && <>
            <label htmlFor="gb-message">축하 메시지 <span className="gb-field-help">{count(text)} / 100</span></label>
            <textarea id="gb-message" name="message" required rows={4} maxLength={200} placeholder="두 사람에게 따뜻한 축하의 마음을 전해 주세요." value={text} disabled={busy} onChange={(event) => setText(Array.from(event.target.value).slice(0, 100).join(""))} />
            <div className="gb-honeypot" aria-hidden="true"><label htmlFor="gb-website">Website</label><input id="gb-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
          </>}
          {formError && <p className="gb-form-error" role="alert">{formError}</p>}
          <button className={`gb-write inv-cta${modal === "write" ? " inv-cta--blue" : ""}`} type="submit" disabled={busy}>{busy ? "처리하고 있어요…" : modal === "write" ? "메시지 등록하기" : "메시지 삭제하기"}</button>
        </form>
      </GuestbookModal>}
    </section>
  );
}
