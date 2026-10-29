// Local Apps Script/Sheets adapter. It does NOT connect to Google services.
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { createHmac, randomUUID } from "node:crypto";

const server = await readFile(new URL("../../apps-script/Code.gs", import.meta.url), "utf8");
const bcrypt = await readFile(new URL("../../apps-script/Bcrypt.gs", import.meta.url), "utf8");
const bridge = await readFile(new URL("../../apps-script/Bridge.html", import.meta.url), "utf8");
export function createGasHarness(options = {}) {
  const state = options.state ?? {
    now: Date.parse("2026-10-29T00:00:00Z"), props: new Map(), sheets: new Map(), cache: new Map(), logs: [], lockBusy: false,
  };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [state.now])); }
    static now() { return state.now; }
  }
  function range(sheet, row, column, height, width) {
    return {
      setNumberFormat(value) {
        for (let i = row; i < row + height; i++) sheet.formats.set(i, value);
        return this;
      },
      setValues(values) {
        if (row + height - 1 > sheet.capacity) throw new Error("Range exceeds Sheet capacity");
        for (let i = 0; i < height; i++) {
          if (row + i > 1 && sheet.formats.get(row + i) !== "@") throw new Error("User rows must be stored as text");
          const target = sheet.rows[row + i - 1] ?? Array(8).fill("");
          for (let j = 0; j < width; j++) target[column + j - 1] = values[i][j];
          sheet.rows[row + i - 1] = target;
        }
        return this;
      },
      getValues() {
        return Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => sheet.rows[row + i - 1]?.[column + j - 1] ?? ""));
      },
    };
  }
  function newSheet(name) {
    const sheet = {
      rows: [], formats: new Map(), capacity: 1000,
      getLastRow() { return this.rows.length; },
      getMaxRows() { return this.capacity; },
      insertRowsAfter(after, count) { if (after !== this.capacity) throw new Error("Unexpected insertion"); this.capacity += count; },
      appendRow(row) { this.rows.push([...row]); return this; },
      getRange(row, column, height = 1, width = 1) { return range(this, row, column, height, width); },
      setFrozenRows() { return this; },
      deleteRow(row) { this.rows.splice(row - 1, 1); return this; },
    };
    state.sheets.set(name, sheet);
    return sheet;
  }
  const book = { getId: () => "LOCAL_ADAPTER_NOT_A_GOOGLE_SHEET", getSheetByName: (name) => state.sheets.get(name) ?? null, insertSheet: newSheet };
  const props = {
    getProperty: (key) => state.props.get(key) ?? null,
    setProperty(key, value) { state.props.set(key, String(value)); return this; },
    deleteProperty(key) { state.props.delete(key); return this; },
    getProperties: () => Object.fromEntries(state.props),
    setProperties(values, deleteOthers) { if (deleteOthers) state.props.clear(); for (const [key, value] of Object.entries(values)) state.props.set(key, String(value)); return this; },
  };
  const cache = {
    get(key) { const item = state.cache.get(key); return item && item.until > state.now ? item.value : null; },
    put(key, value, seconds) { if (Buffer.byteLength(value) > 100000) throw new Error("Cache item exceeds limit"); state.cache.set(key, { value, until: state.now + seconds * 1000 }); },
    remove(key) { state.cache.delete(key); },
  };
  function html(content) {
    return { content, mode: "DEFAULT", setTitle() { return this; }, setXFrameOptionsMode(mode) { this.mode = mode; return this; }, getContent() { return this.content; } };
  }
  const context = vm.createContext({
    // Apps Script has no browser/Node timer APIs. Do not mask vendor load errors.
    Date: Clock,
    console: { log: (value) => state.logs.push(String(value)) },
    SpreadsheetApp: { getActiveSpreadsheet: () => book, openById: (id) => { if (id !== book.getId()) throw new Error("Unknown test Sheet"); return book; } },
    PropertiesService: { getScriptProperties: () => props },
    CacheService: { getScriptCache: () => cache },
    LockService: { getScriptLock: () => ({ tryLock: () => !state.lockBusy, releaseLock() {} }) },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: "ALLOWALL" },
      createHtmlOutput: html,
      createTemplateFromFile: (name) => ({ bootstrapJson: "", evaluate() { if (name !== "Bridge") throw new Error("Unexpected template"); return html(bridge.replace("<?!= bootstrapJson ?>", this.bootstrapJson)); } }),
    },
    Utilities: {
      getUuid: randomUUID,
      sleep: (ms) => { state.now += ms; },
      computeHmacSha256Signature: (value, secret) => [...createHmac("sha256", secret).update(value).digest()].map((byte) => byte > 127 ? byte - 256 : byte),
      base64EncodeWebSafe: (value) => Buffer.from(value).toString("base64url"),
      base64DecodeWebSafe: (value) => [...Buffer.from(value, "base64url")],
      newBlob: (bytes) => ({ getDataAsString: () => Buffer.from(bytes.map((byte) => byte & 255)).toString("utf8") }),
    },
  });
  vm.runInContext(bcrypt, context, { filename: "Bcrypt.gs" });
  vm.runInContext(server, context, { filename: "Code.gs" });
  const rpc = (request) => JSON.parse(JSON.stringify(context.guestbookRpc(request)));
  if (options.setup !== false && !state.props.has("SPREADSHEET_ID")) context.setupGuestbook_();
  function session(visitorId = randomUUID()) {
    const result = rpc({ protocol: 1, action: "bootstrap", visitorId });
    if (!result.ok) throw new Error("Fixture bootstrap: " + result.code);
    return { visitorId, token: result.data.token, page: result.data };
  }
  return {
    context, state, rpc, session, props, book,
    advance: (ms) => { state.now += ms; },
    call: (who, action, fields = {}) => rpc({ protocol: 1, visitorId: who.visitorId, token: who.token, action, ...fields }),
    sheet: () => state.sheets.get("Guestbook"),
    renderBridge: (origin, nonce) => context.doGet({ parameter: { origin, nonce } }),
  };
}

export function createEntry(harness, who, fields = {}) {
  return harness.call(who, "create", { name: "홍길동", message: "두 분의 결혼을 축하합니다.", password: "test-password-1234", website: "", requestId: randomUUID(), ...fields });
}
