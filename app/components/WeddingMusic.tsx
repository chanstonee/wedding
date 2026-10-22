"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

const publicBasePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "";

export type WeddingMusicHandle = { start: () => void };

const WeddingMusic = forwardRef<WeddingMusicHandle, { visible: boolean }>(
  function WeddingMusic({ visible }, ref) {
    const audio = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [message, setMessage] = useState("");
    const attempt = useRef(0);

    const start = () => {
      const player = audio.current;
      if (!player) return;
      const currentAttempt = ++attempt.current;
      setMessage("");
      if (player.error) player.load();
      // Start inside the curtain click, before mobile user activation expires.
      player.play().catch((error: unknown) => {
        if (currentAttempt !== attempt.current) return;
        setPlaying(false);
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage("음악 버튼을 눌러 다시 재생해 주세요.");
      });
    };

    useImperativeHandle(ref, () => ({ start }));

    const toggle = () => {
      const player = audio.current;
      if (!player) return;
      if (!player.paused) {
        ++attempt.current;
        player.pause();
        setMessage("");
      } else start();
    };

    return (
      <>
        <audio
          ref={audio}
          src={`${publicBasePath}/assets/invitation/two-people.mp3`}
          preload="auto"
          loop
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setMessage("음악을 불러오지 못했어요. 버튼을 눌러 다시 시도해 주세요.");
          }}
        />
        <aside className="inv-music" aria-label="청첩장 음악" hidden={!visible} inert={!visible}>
          <button
            type="button"
            className="inv-music-trigger"
            onClick={toggle}
            aria-pressed={playing}
            aria-label={playing ? "배경음악 끄기" : "배경음악 켜기"}
            title="성시경 — 두 사람"
          >
            <span aria-hidden="true">{playing ? "♫" : "♪"}</span>
            BGM {playing ? "ON" : "OFF"}
          </button>
          <p className="inv-music-status" role="status">{message}</p>
        </aside>
      </>
    );
  },
);

export default WeddingMusic;
