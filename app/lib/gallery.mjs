// Paths relative to public/, listed once in the popup's display order.
export const galleryPhotoFiles = [
  "assets/invitation/section-5-img.jpg",
];

/** @param {readonly string[]} photos */
export function getGalleryPreview(photos) {
  return photos.slice(0, 6).map((src, index) => ({
    src,
    index,
    moreCount: index === 5 ? photos.length - 5 : 0,
  }));
}

/** @param {number} index @param {number} direction @param {number} count */
export function getNextPhotoIndex(index, direction, count) {
  return count > 0 ? ((index + direction) % count + count) % count : 0;
}
