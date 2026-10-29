import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/assets/invitation/section-0-img.svg", import.meta.url), "utf8");
const artwork = JSON.parse(await readFile(new URL("../app/lib/hero-couple-paths.json", import.meta.url), "utf8"));
const original = [...source.matchAll(/<path\b([^>]+)\/>/g)].map(([, attributes]) =>
  Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [
    key.replace("fill-opacity", "fillOpacity").replace("fill-rule", "fillRule").replace("clip-rule", "clipRule"), value,
  ])),
);

test("animation data preserves all original path geometry, colors and paint order", () => {
  assert.equal(original.length, 314);
  assert.deepEqual(artwork.paths, original);
  assert.equal(artwork.viewBox, "0 0 326 272.315");
  assert.equal(artwork.opacity, 0.8);
});

test("exported inline SVG preserves the original paths and exposes motion groups", async () => {
  const html = await readFile(new URL("../out/index.html", import.meta.url), "utf8");
  const svg = html.match(/<svg\b[^>]*class="inv-couple-art"[\s\S]*?<\/svg>/)?.[0];
  assert.ok(svg, "the hero must render accessible inline SVG");
  const rendered = [...svg.matchAll(/<path\b([^>]+)>/g)].map(([, attributes]) =>
    Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])),
  );
  const sources = new Map(original.map((path) => [path.id, path]));
  const firstAppearance = new Set();
  const elementIds = new Set();
  for (const path of rendered) {
    const source = sources.get(path["data-original-id"]);
    assert.ok(source, "every clipped fragment must come from an original path");
    for (const key of ["d", "fill", "fillOpacity", "fillRule", "clipRule"]) {
      const attribute = key.replace("fillOpacity", "fill-opacity").replace("fillRule", "fill-rule").replace("clipRule", "clip-rule");
      assert.equal(path[attribute], source[key], `${source.id}: ${key}`);
    }
    assert.ok(!elementIds.has(path.id), "SVG fragment IDs must remain unique");
    elementIds.add(path.id);
    firstAppearance.add(source.id);
  }
  assert.deepEqual([...firstAppearance], original.map(({ id }) => id));
  for (const clip of ["dress-body", "dress-hem", "hair-root", "hair-tip"])
    assert.ok(svg.includes(`<clipPath id="inv-hero-${clip}"`), clip);
  for (const group of ["Male", "Female", "Dress", "Hair", "Decoration"])
    assert.ok(svg.includes(`data-part="${group}"`), group);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="손을 맞잡고 춤추는 신랑과 신부"/);
});
