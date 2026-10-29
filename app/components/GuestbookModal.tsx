"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const base = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "";
type Viewport = { top: number; height: number };

// Measure the active textarea line using its actual font, width and wrapping.
// No value, selection or focus changes; the temporary text-only mirror is removed.
function textareaCaret(element: HTMLTextAreaElement) {
  const style = getComputedStyle(element);
  const mirror = document.createElement("div");
  for (const property of [
    "font-family", "font-size", "font-weight", "font-style", "font-variant",
    "line-height", "letter-spacing", "word-spacing", "text-indent", "text-align",
    "text-transform", "direction", "tab-size", "padding-top", "padding-right",
    "padding-bottom", "padding-left",
  ]) mirror.style.setProperty(property, style.getPropertyValue(property));
  Object.assign(mirror.style, {
    position: "fixed", left: "0", top: "0", visibility: "hidden",
    pointerEvents: "none", boxSizing: "border-box", border: "0",
    width: `${element.clientWidth}px`, whiteSpace: "pre-wrap", overflowWrap: "break-word",
  });
  mirror.setAttribute("aria-hidden", "true");
  const position = element.selectionDirection === "backward" ? element.selectionStart : element.selectionEnd;
  mirror.textContent = element.value.slice(0, position);
  const marker = document.createElement("span");
  marker.textContent = element.value.slice(position) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  try {
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const first = marker.getClientRects()[0] ?? marker.getBoundingClientRect();
    const row = Math.max(0, Math.floor((first.top - mirror.getBoundingClientRect().top - paddingTop + 1) / lineHeight));
    const lineTop = paddingTop + row * lineHeight;
    const max = Math.max(0, element.scrollHeight - element.clientHeight);
    let next = element.scrollTop;
    if (lineTop < next + paddingTop) next = lineTop - paddingTop;
    else if (lineTop + lineHeight > next + element.clientHeight - paddingBottom)
      next = lineTop + lineHeight - element.clientHeight + paddingBottom;
    next = Math.max(0, Math.min(max, next));
    if (Math.abs(element.scrollTop - next) > 1) element.scrollTop = next;
    const top = element.getBoundingClientRect().top + (parseFloat(style.borderTopWidth) || 0) + lineTop - element.scrollTop;
    return { top, bottom: top + lineHeight };
  } finally { mirror.remove(); }
}

// Scroll only the form's own viewport; scrollIntoView can pan the whole page on iOS.
function revealControl(area: HTMLDivElement, viewport: Viewport) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !area.contains(active) || !active.matches("input, textarea, button") || !active.getClientRects().length) return;
  const bounds = area.getBoundingClientRect();
  const style = getComputedStyle(area);
  const top = Math.max(bounds.top, viewport.top) + (parseFloat(style.paddingTop) || 0);
  const bottom = Math.min(bounds.bottom, viewport.top + viewport.height) - (parseFloat(style.paddingBottom) || 0);
  if (bottom <= top) return;
  const rect = active.getBoundingClientRect();
  const caret = active instanceof HTMLTextAreaElement ? textareaCaret(active) : null;
  const target = rect.height <= bottom - top ? rect : caret ?? {
    top: rect.top + (rect.height - 24) / 2,
    bottom: rect.top + (rect.height + 24) / 2,
  };
  const delta = target.top < top ? target.top - top : target.bottom > bottom ? target.bottom - bottom : 0;
  if (Math.abs(delta) > 1) area.scrollTop += delta;
}

export default function GuestbookModal({ title, busy, close, children }: {
  title: string; busy: boolean; close: () => void; children: ReactNode;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const formViewport = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(busy);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useLayoutEffect(() => {
    const layer = overlay.current, area = formViewport.current;
    if (!layer || !area) return;
    const previous = document.activeElement as HTMLElement | null;
    const page = { x: window.scrollX, y: window.scrollY };
    const body = document.body, html = document.documentElement;
    const properties = ["position", "top", "left", "right", "width"];
    const saved = properties.map(name => [name, body.style.getPropertyValue(name), body.style.getPropertyPriority(name)]);
    const htmlMinHeight = [html.style.getPropertyValue("min-height"), html.style.getPropertyPriority("min-height")];
    // Retain the layout viewport's document height while fixing the body. This
    // avoids clamping window.scrollY and changing background scroll animations.
    html.style.setProperty("min-height", `${html.scrollHeight}px`);
    body.style.position = "fixed";
    body.style.top = `${-page.y}px`;
    body.style.left = `${-page.x}px`;
    body.style.right = "0";
    body.style.width = "100%";
    closeButton.current?.focus({ preventScroll: true });

    let frame = 0, mounted = true;
    const viewport = window.visualViewport;
    const sync = () => {
      frame = 0;
      if (!mounted) return;
      const visible = { height: viewport?.height ?? window.innerHeight, top: viewport?.offsetTop ?? 0 };
      layer.style.setProperty("--gb-visible-height", `${visible.height}px`);
      layer.style.setProperty("--gb-visible-top", `${visible.top}px`);
      revealControl(area, visible);
    };
    const queue = () => { if (mounted && !frame) frame = requestAnimationFrame(sync); };
    let lastControl: Element | null = null, lastSelection = "";
    const rememberSelection = () => {
      const active = document.activeElement;
      const value = active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement
        ? `${active.selectionStart}:${active.selectionEnd}:${active.selectionDirection}` : "";
      const changed = active !== lastControl || value !== lastSelection;
      lastControl = active; lastSelection = value;
      return changed;
    };
    const focusOrInput = () => { rememberSelection(); queue(); };
    // Scrolling a focused field must not snap the form back to the caret.
    const selection = () => { if (area.contains(document.activeElement) && rememberSelection()) queue(); };
    const preventBackgroundDrag = (event: TouchEvent) => {
      if (event.touches.length === 1 && !area.contains(event.target as Node) && event.cancelable) event.preventDefault();
    };
    sync();
    viewport?.addEventListener("resize", queue);
    viewport?.addEventListener("scroll", queue);
    window.addEventListener("resize", queue);
    area.addEventListener("focusin", focusOrInput);
    area.addEventListener("input", focusOrInput);
    document.addEventListener("selectionchange", selection);
    layer.addEventListener("touchmove", preventBackgroundDrag, { passive: false });
    const observer = new ResizeObserver(queue);
    observer.observe(area);
    void document.fonts.ready.then(queue);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); close(); }
      if (event.key !== "Tab" || !panel.current) return;
      const elements = Array.from(panel.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled):not([tabindex="-1"]), textarea:not(:disabled), a[href]',
      )).filter(element => element.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport?.removeEventListener("resize", queue);
      viewport?.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      area.removeEventListener("focusin", focusOrInput);
      area.removeEventListener("input", focusOrInput);
      document.removeEventListener("selectionchange", selection);
      document.removeEventListener("keydown", keydown);
      layer.removeEventListener("touchmove", preventBackgroundDrag);
      const active = document.activeElement;
      if (active instanceof HTMLElement && layer.contains(active)) active.blur();
      for (const [name, value, priority] of saved) {
        if (value) body.style.setProperty(name, value, priority);
        else body.style.removeProperty(name);
      }
      if (htmlMinHeight[0]) html.style.setProperty("min-height", htmlMinHeight[0], htmlMinHeight[1]);
      else html.style.removeProperty("min-height");
      window.scrollTo(page.x, page.y);
      requestAnimationFrame(() => {
        if (document.querySelector(".gb-overlay")) return;
        if (previous?.isConnected) previous.focus({ preventScroll: true });
        window.scrollTo(page.x, page.y);
      });
    };
  }, [close]);
  const root = typeof document === "undefined" ? null : document.querySelector(".wedding-invitation");
  if (!root) return null;
  return createPortal(
    <div ref={overlay} className="gb-overlay"
      onClick={event => { if (event.target === event.currentTarget && !busy) close(); }}>
      <div ref={panel} className="gb-dialog" role="dialog" aria-modal="true" aria-labelledby="gb-dialog-title">
        <header className="gb-dialog-header">
          <h2 id="gb-dialog-title">{title}</h2>
          <button ref={closeButton} className="gb-close" type="button" onClick={close} disabled={busy} aria-label={`${title} 닫기`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Keep the invitation's existing close icon. */}
            <img src={`${base}/assets/invitation/section-9-imgIcon1.svg`} alt="" width="20" height="20" />
          </button>
        </header>
        <div ref={formViewport} className="gb-dialog-body">{children}</div>
      </div>
    </div>, root,
  );
}
