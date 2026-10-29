import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHmac, randomUUID } from "node:crypto";
import { createGasHarness, createEntry } from "./helpers/guestbook-gas-harness.mjs";

test("setup preserves secrets and existing rows and refuses incompatible headers", () => {
  const h = createGasHarness();
  const secret = h.props.getProperty("PRIVATE_PEPPER");
  h.context.setupGuestbook_();
  assert.equal(h.props.getProperty("PRIVATE_PEPPER"), secret);
  assert.equal(h.sheet().rows.length, 1);
  h.sheet().rows[0][0] = "different-header";
  assert.throws(() => h.context.setupGuestbook_(), /덮어쓰지/);
  assert.equal(h.sheet().rows[0][0], "different-header");
});

test("registration stores a real salted bcrypt hash, JSON text and public-only fields", () => {
  const h = createGasHarness(), who = h.session();
  assert.deepEqual(who.page.entries, []);
  h.advance(2600);
  const password = "한글😀 비밀번호 1234", message = '=HYPERLINK("https://example.invalid")\n<script>alert(1)</script>';
  const result = createEntry(h, who, { password, message });
  assert.equal(result.ok, true);
  const row = h.sheet().rows[1];
  assert.match(row[4], /^\$2b\$12\$/);
  assert.ok(!JSON.stringify(row).includes(password));
  assert.equal(row[2], JSON.stringify("홍길동"));
  assert.equal(row[3], JSON.stringify(message));
  assert.equal(h.sheet().formats.get(2), "@");
  assert.equal(Object.keys(result.data.entry).sort().join(","), "createdAt,id,message,name");
  const raw = createHmac("sha256", h.props.getProperty("PRIVATE_PEPPER")).update("password:" + password).digest("hex");
  assert.equal(h.context.bcrypt.compareSync(raw, row[4]), true);
  assert.equal(h.context.bcrypt.compareSync(password, row[4]), false);
  const second = createEntry(h, who, { password });
  assert.equal(second.ok, true);
  assert.notEqual(row[4], h.sheet().rows[2][4]);
});

test("another client and a new server execution read persistent Sheet rows without secrets", () => {
  const h = createGasHarness(), one = h.session();h.advance(2600);
  const result = createEntry(h, one);
  const nextExecution = createGasHarness({ state: h.state }), two = nextExecution.session();
  assert.equal(two.page.entries[0].id, result.data.entry.id);
  const serialized = JSON.stringify(two.page);
  for (const privateValue of [h.props.getProperty("PRIVATE_PEPPER"), h.sheet().rows[1][4], "password_hash", "visitor_key", "request_digest"])
    assert.ok(!serialized.includes(privateValue));
});

test("server validates Unicode lengths, whitespace, control characters and honeypot before storage", () => {
  const h = createGasHarness(), who = h.session();h.advance(2600);
  for (const fields of [
    { name: " " }, { name: "가".repeat(21) }, { name: "줄\n바꿈" },
    { message: " " }, { message: "😀".repeat(101) }, { message: "bad\u0000text" },
    { password: "123" }, { password: "    " }, { website: "https://spam.invalid" },
  ]) assert.equal(createEntry(h, who, fields).code, "INVALID");
  assert.equal(h.sheet().rows.length, 1);
  assert.equal(createEntry(h, who, { name: "가".repeat(20), message: "😀".repeat(100) }).ok, true);
});

test("server rejects forged/expired sessions and a copied token with a different visitor ID", () => {
  const h = createGasHarness(), who = h.session();
  assert.equal(h.call({ ...who, token: who.token.slice(0, -1) + (who.token.endsWith("a") ? "b" : "a") }, "list").code, "SESSION");
  assert.equal(h.call({ ...who, visitorId: randomUUID() }, "list").code, "SESSION");
  h.advance(3600001);
  assert.equal(h.call(who, "list").code, "SESSION");
  assert.equal(h.rpc({ protocol: 1, action: "bootstrap", visitorId: "bad-id" }).code, "INVALID");
});

test("duplicate submission is idempotent but a changed payload cannot reuse its request ID", () => {
  const h = createGasHarness(), who = h.session();h.advance(2600);
  const requestId = randomUUID(), one = createEntry(h, who, { requestId }), duplicate = createEntry(h, who, { requestId });
  assert.equal(duplicate.ok, true);assert.equal(duplicate.data.entry.id, one.data.entry.id);
  assert.equal(h.sheet().rows.length, 2);
  assert.equal(createEntry(h, who, { requestId, message: "다른 내용" }).code, "INVALID");
  assert.equal(h.sheet().rows.length, 2);
});

test("deletion requires confirmation and the matching password; repeat deletion is harmless", () => {
  const h = createGasHarness(), who = h.session();h.advance(2600);
  const result = createEntry(h, who), id = result.data.entry.id;
  assert.equal(h.call(who, "delete", { id, password: "test-password-1234", confirm: false }).code, "INVALID");
  assert.equal(h.call(who, "delete", { id, password: "wrong-password", confirm: true }).code, "PASSWORD");
  assert.equal(h.sheet().rows.length, 2);
  assert.equal(h.call(who, "delete", { id, password: "test-password-1234", confirm: true }).ok, true);
  assert.equal(h.sheet().rows.length, 1);
  assert.equal(h.call(who, "list").data.entries.length, 0);
  assert.equal(h.call(who, "delete", { id, password: "test-password-1234", confirm: true }).ok, true);
});

test("password attempts are limited per message even when visitor IDs are rotated", () => {
  const h = createGasHarness(), owner = h.session();h.advance(2600);
  const id = createEntry(h, owner).data.entry.id;
  for (let n = 0; n < 5; n++) assert.equal(h.call(h.session(), "delete", { id, password: "wrong-password", confirm: true }).code, "PASSWORD");
  const blocked = h.call(h.session(), "delete", { id, password: "test-password-1234", confirm: true });
  assert.equal(blocked.code, "RATE");assert(blocked.retryAfter > 0);
  assert.equal(h.sheet().rows.length, 2);
  h.advance(1800001);
  assert.equal(h.call(h.session(), "delete", { id, password: "test-password-1234", confirm: true }).ok, true);
});

test("timing and per-visitor/global budgets limit anonymous spam", () => {
  const h = createGasHarness(), who = h.session();
  assert.equal(createEntry(h, who).code, "TOO_FAST");h.advance(2600);
  for (let n = 0; n < 3; n++) assert.equal(createEntry(h, who).ok, true);
  assert.equal(createEntry(h, who).code, "RATE");
  h.props.setProperty("rate:create-hour", JSON.stringify({ count: 120, until: h.state.now + 3600000 }));
  const other = h.session();h.advance(2600);
  assert.equal(createEntry(h, other).code, "RATE");
});

test("pagination is stable and locks fail closed", () => {
  const h = createGasHarness(), who = h.session(), row = [randomUUID(), "2026-10-29T00:00:00.000Z", '"이름"', '"메시지"', "PRIVATE_HASH", randomUUID(), "PRIVATE_VISITOR", "PRIVATE_DIGEST"];
  for (let n = 0; n < 35; n++) h.sheet().rows.push([randomUUID(), new Date(h.state.now - n * 1000).toISOString(), ...row.slice(2)]);
  h.context.invalidateList_();
  const first = h.call(who, "list").data;
  assert.equal(first.entries.length, 30);assert.ok(first.nextCursor);
  const second = h.call(who, "list", { cursor: first.nextCursor }).data;
  assert.equal(second.entries.length, 5);assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.entries, ...second.entries].map((entry) => entry.id)).size, 35);
  h.state.lockBusy = true;
  assert.equal(h.call(who, "list").code, "BUSY");
});

test("bridge is restricted to allowed parent origins and all administrative helpers are private", async () => {
  const h = createGasHarness(), nonce = "a".repeat(32);
  assert.equal(h.renderBridge("https://attacker.invalid", nonce).mode, "DEFAULT");
  assert.equal(h.renderBridge("https://chanstonee.github.io", "bad-nonce").mode, "DEFAULT");
  const bridge = h.renderBridge("https://chanstonee.github.io", nonce);
  assert.equal(bridge.mode, "ALLOWALL");assert.ok(bridge.content.includes(nonce));
  assert.ok(!bridge.content.includes(h.props.getProperty("PRIVATE_PEPPER")));
  const source = await readFile(new URL("../apps-script/Code.gs", import.meta.url), "utf8");
  const publicNames = [...source.matchAll(/^function (\w+)\(/gm)].map(([, name]) => name).filter((name) => !name.endsWith("_"));
  assert.deepEqual(publicNames, ["doGet", "guestbookRpc"]);
});

test("owner self-test exercises real backend functions and cleans only its own test row", () => {
  const h = createGasHarness(), who = h.session();h.advance(2600);
  const existing = createEntry(h, who).data.entry.id;
  const result = h.context.testGuestbookConnection_();
  assert.equal(result.completed, true);assert.equal(result.wrongPasswordBlocked, true);
  assert.equal(h.sheet().rows.length, 2);assert.equal(h.sheet().rows[1][0], existing);
  assert.ok(h.state.logs.every((log) => !log.includes("$2") && !log.includes(h.props.getProperty("PRIVATE_PEPPER"))));
});
