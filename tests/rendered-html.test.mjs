import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const output = new URL("../out/", import.meta.url);
const basePath = (process.env.PAGES_BASE_PATH ?? "/wedding").replace(/\/$/, "");

test("exports the Figma invitation through the ending for GitHub Pages", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  assert.match(html, /<html[^>]*lang="ko"/);
  for (const title of [
    "재훈 &amp; 다연",
    "날짜 안내",
    "타임테이블",
    "우리의 웨딩스냅",
    "마음 전하실 곳",
    "신부 유다연",
    "신랑 주재훈",
    "초대장 열기",
  ])
    assert.ok(html.includes(title), title);
  assert.equal((html.match(/<section class="inv-section /g) ?? []).length, 9);
  assert.match(html, /class="inv-section inv-ending"/);
  assert.doesNotMatch(html, /드레스코드|꿈을 위한 안내|class="guestbook/);
  assert.ok(html.includes(`${basePath}/_next/`));
  assert.ok(html.includes(`${basePath}/assets/invitation/section-0-img.svg`));
  assert.match(html, /계좌번호는 디자인 확인용 예시입니다/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /관리자 이메일|인증 메일 보내기/);
  await access(new URL(".nojekyll", output));
});

test("all original Figma assets are local and the exported page has no temporary asset URLs", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../figma-assets.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.length, 51);
  for (const asset of manifest) {
    const bytes = await readFile(
      new URL(`assets/invitation/${asset.file}`, output),
    );
    assert.ok(bytes.byteLength > 0, asset.file);
    assert.equal(bytes.byteLength, asset.bytes, asset.file);
  }
  const html = await readFile(new URL("index.html", output), "utf8");
  assert.doesNotMatch(html, /figma\.com\/api\/mcp\/asset/);
});

test("does not export the retired admin route", async () => {
  await assert.rejects(access(new URL("admin/", output)), { code: "ENOENT" });
});

test("ships the MP3 player before the curtain opens with the correct Pages path", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  const audio = html.match(/<audio\b[^>]*>/)?.[0];
  assert.ok(audio, "audio must already be mounted for the first curtain tap");
  assert.ok(audio.includes(`${basePath}/assets/invitation/two-people.mp3`));
  assert.match(audio, /\bloop(?:="")?/);
  assert.match(audio, /preload="auto"/);
  assert.doesNotMatch(html, /youtube\.com\/embed|윤미래/);
  const source = await readFile(new URL("../public/assets/invitation/two-people.mp3", import.meta.url));
  const exported = await readFile(new URL("assets/invitation/two-people.mp3", output));
  assert.ok(source.byteLength > 0);
  assert.deepEqual(exported, source);
});
