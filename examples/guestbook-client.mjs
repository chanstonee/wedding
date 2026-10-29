/** Prepared integration example. NOT imported by the current invitation. */
const prefix = "wedding-guestbook";
const protocol = 1;
export class GuestbookError extends Error {
  constructor(code, message, retryAfter = 0) {
    super(message);
    this.name = "GuestbookError";
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function scriptUrl(value) {
  let url;
  try { url = new URL(value); }
  catch { throw new GuestbookError("CONFIG", "올바른 Apps Script 웹앱 /exec URL이 필요합니다."); }
  if (url.origin !== "https://script.google.com" || !/^\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(url.pathname) || url.search || url.hash || url.username || url.password)
    throw new GuestbookError("CONFIG", "올바른 Apps Script 웹앱 /exec URL이 필요합니다.");
  return url;
}
function bridgeOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && (url.hostname === "script.google.com" || /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname));
  } catch { return false; }
}
function entry(value) {
  if (!value || typeof value.id !== "string" || !/^[a-f0-9-]{36}$/.test(value.id) || typeof value.name !== "string" || typeof value.message !== "string" || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt)))
    throw new GuestbookError("RESPONSE", "방명록 응답을 확인하지 못했어요.");
  // Do not retain unexpected fields, even if a misconfigured backend sends them.
  return { id: value.id, name: value.name, message: value.message, createdAt: value.createdAt };
}
function page(value) {
  if (!value || !Array.isArray(value.entries) || (value.nextCursor !== null && typeof value.nextCursor !== "string"))
    throw new GuestbookError("RESPONSE", "방명록 응답을 확인하지 못했어요.");
  return { entries: value.entries.map(entry), nextCursor: value.nextCursor };
}

export class GuestbookClient {
  constructor(url) {
    this.url = scriptUrl(url);
    this.pending = new Map();
    this.frame = null;
    this.ready = null;
    this.peer = null;
    this.peerOrigin = null;
    this.nonce = null;
    this.session = null;
    this.sessionPromise = null;
    this.onMessage = this.onMessage.bind(this);
  }
  visitorId() {
    if (this.visitor) return this.visitor;
    const key = "wedding:guestbook:visitor";
    let saved;
    try { saved = localStorage.getItem(key); } catch { /* Storage may be disabled. */ }
    this.visitor = saved && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(saved) ? saved : crypto.randomUUID();
    try { localStorage.setItem(key, this.visitor); } catch { /* A memory-only visitor ID also works. */ }
    return this.visitor;
  }
  connect() {
    if (this.ready) return this.ready;
    this.nonce = [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
      this.readyTimer = setTimeout(() => this.destroy(new GuestbookError("CONNECTION", "방명록에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.")), 20000);
    });
    const url = new URL(this.url);
    url.searchParams.set("origin", location.origin);
    url.searchParams.set("nonce", this.nonce);
    const frame = document.createElement("iframe");
    frame.src = url.href;
    frame.title = "방명록 서버 연결";
    frame.hidden = true;
    frame.tabIndex = -1;
    frame.referrerPolicy = "strict-origin";
    window.addEventListener("message", this.onMessage);
    this.frame = frame;
    document.body.appendChild(frame);
    return this.ready;
  }
  onMessage(event) {
    const data = event.data;
    if (!data || data.nonce !== this.nonce || data.protocol !== protocol || !bridgeOrigin(event.origin)) return;
    if (data.type === prefix + ":ready" && !this.peer && event.source && this.frame) {
      // HtmlService runs inside Google's nested sandbox frame. Its WindowProxy
      // (received from this unpredictable nonce handshake) is the RPC peer.
      this.peer = event.source;
      this.peerOrigin = event.origin;
      clearTimeout(this.readyTimer);
      this.resolveReady();
      this.resolveReady = null;
      this.rejectReady = null;
      return;
    }
    if (data.type !== prefix + ":response" || event.source !== this.peer || event.origin !== this.peerOrigin) return;
    const pending = this.pending.get(data.id);
    if (!pending) return;
    this.pending.delete(data.id);
    clearTimeout(pending.timer);
    if (data.result?.ok === true) pending.resolve(data.result.data);
    else pending.reject(new GuestbookError(data.result?.code || "RESPONSE", data.result?.message || "방명록 요청을 처리하지 못했어요.", data.result?.retryAfter || 0));
  }
  async request(action, fields = {}) {
    await this.connect();
    const id = crypto.randomUUID();
    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new GuestbookError("TIMEOUT", "처리 결과를 확인하지 못했어요. 같은 요청으로 다시 시도해 주세요."));
      }, 25000);
      this.pending.set(id, { resolve, reject, timer });
    });
    this.peer.postMessage({ type: prefix + ":request", protocol, nonce: this.nonce, id, payload: { ...fields, action, protocol, visitorId: this.visitorId(), token: this.session } }, this.peerOrigin);
    return result;
  }
  async bootstrap() {
    if (this.sessionPromise) return this.sessionPromise;
    this.sessionPromise = this.request("bootstrap").then((value) => {
      if (typeof value.token !== "string") throw new GuestbookError("RESPONSE", "방명록 연결 응답을 확인하지 못했어요.");
      this.session = value.token;
      return page(value);
    }).catch((error) => { this.sessionPromise = null; throw error; });
    return this.sessionPromise;
  }
  async authorized(action, fields) {
    await this.bootstrap();
    try { return await this.request(action, fields); }
    catch (error) {
      if (error.code !== "SESSION") throw error;
      this.session = null;
      this.sessionPromise = null;
      await this.bootstrap();
      return this.request(action, fields);
    }
  }
  /** @param {string | null} [cursor] */
  async list(cursor = null) { return page(await this.authorized("list", { cursor })); }
  async create({ name, message, password, website = "" }, requestId) {
    if (!requestId) throw new GuestbookError("INVALID", "중복 등록 방지를 위한 요청 ID가 필요합니다.");
    const value = await this.authorized("create", { name, message, password, website, requestId });
    return entry(value.entry);
  }
  async delete(id, password, confirm) {
    const value = await this.authorized("delete", { id, password, confirm });
    if (!value || value.id !== id || value.deleted !== true) throw new GuestbookError("RESPONSE", "삭제 결과를 확인하지 못했어요.");
    return { id, deleted: true };
  }
  destroy(reason = new GuestbookError("CONNECTION", "방명록 연결을 닫았습니다.")) {
    window.removeEventListener("message", this.onMessage);
    clearTimeout(this.readyTimer);
    this.frame?.remove();
    this.frame = null;
    this.peer = null;
    this.peerOrigin = null;
    this.nonce = null;
    this.session = null;
    this.sessionPromise = null;
    this.ready = null;
    this.rejectReady?.(reason);
    this.resolveReady = null;
    this.rejectReady = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(reason);
    }
    this.pending.clear();
  }
}
