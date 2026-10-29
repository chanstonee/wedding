import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { galleryPhotoFiles, getGalleryPreview, getNextPhotoIndex } from "../app/lib/gallery.mjs";

test("production gallery uses existing real photo files without duplicates", async () => {
  assert.ok(galleryPhotoFiles.length > 0);
  assert.equal(new Set(galleryPhotoFiles).size, galleryPhotoFiles.length);
  for (const path of galleryPhotoFiles) {
    assert.ok(path.startsWith("assets/invitation/"));
    await access(new URL(`../public/${path}`, import.meta.url));
  }
});

test("fewer than six photos show only their actual cells with no more overlay", () => {
  for (const count of [0, 1, 2, 5]) {
    const photos = Array.from({ length: count }, (_, index) => `photo-${index}`);
    const preview = getGalleryPreview(photos);
    assert.deepEqual(preview.map(({ src }) => src), photos);
    assert.ok(preview.every(({ moreCount }) => moreCount === 0));
  }
});

test("six or more photos show five thumbnails and the first hidden photo as the more cell", () => {
  for (const count of [6, 7, 12]) {
    const photos = Array.from({ length: count }, (_, index) => `photo-${index}`);
    const preview = getGalleryPreview(photos);
    assert.equal(preview.length, 6);
    assert.deepEqual(preview.slice(0, 5).map(({ src }) => src), photos.slice(0, 5));
    assert.ok(preview.slice(0, 5).every(({ moreCount }) => moreCount === 0));
    assert.deepEqual(preview[5], { src: photos[5], index: 5, moreCount: count - 5 });
  }
});

test("popup navigation wraps using the actual photo count", () => {
  for (const count of [1, 5, 6, 7, 12]) {
    assert.equal(getNextPhotoIndex(count - 1, 1, count), 0);
    assert.equal(getNextPhotoIndex(0, -1, count), count - 1);
    assert.equal(getNextPhotoIndex(0, count * 2 + 1, count), 1 % count);
  }
  assert.equal(getNextPhotoIndex(0, 1, 0), 0);
});
