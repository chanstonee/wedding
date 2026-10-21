"use client";

import { useEffect, useRef, useState } from "react";

const videoId = "bLTH-HBHJcs";
const musicUrl = `https://music.youtube.com/watch?v=${videoId}`;

export default function WeddingMusic({ visible }: { visible: boolean }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { if (!visible) setOpen(false); }, [visible]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  if (!visible) return null;
  return (
    <aside className="inv-music" aria-label="청첩장 음악">
      <button
        ref={trigger}
        className="inv-music-trigger"
        onClick={() => open ? close() : setOpen(true)}
        aria-expanded={open}
        aria-controls={open ? "inv-music-player" : undefined}
      >
        <span aria-hidden="true">♪</span> {open ? "음악 닫기" : "BGM 듣기"}
      </button>
      {open && (
        <section
          id="inv-music-player"
          className="inv-music-panel"
          aria-label="윤미래 I Love You 유튜브 플레이어"
          onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}
        >
          <header>
            <div><strong>I Love You</strong><span>윤미래</span></div>
            <button onClick={close} aria-label="음악 재생 종료">×</button>
          </header>
          <iframe
            title="윤미래 — I Love You"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&loop=1&playlist=${videoId}&rel=0&origin=${encodeURIComponent(origin)}`}
            width="288"
            height="200"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <a href={musicUrl} target="_blank" rel="noopener">YouTube Music에서 듣기 ↗</a>
        </section>
      )}
    </aside>
  );
}
