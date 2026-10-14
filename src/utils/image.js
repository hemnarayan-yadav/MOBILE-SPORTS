// Adapted from frontend/src/utils/image.js: the same choice between stored
// copies, for React Native's <Image>. The web's srcSet and share-image helpers
// are left out — <Image> takes one URI, and the app has no link previews.
//
// Cloudinary transforms on delivery, so a variant is a URL we compose
// (utils/cloudinary.js). CloudFront cannot, so the backend stores web-sized
// copies beside the original at upload time and screens pick between them
// here. Anything else is returned unchanged, so a screen always has an image.

import { IMAGE_WIDTH, cloudinaryImage, withTransformation } from './cloudinary.js';

export { IMAGE_WIDTH };

// A stored display copy: `<original-without-extension>_w<width>.webp`.
const DISPLAY_COPY = /^(https:\/\/[^/]+\/\S+?)_w(\d+)\.webp$/;

// The widths the backend makes for a full-width image. A 1920 copy always has
// a 960 sibling — a smaller copy is never dropped while a larger one is kept.
const WIDE_WIDTHS = Object.freeze([960, 1920]);

// Phone screens are dense; boxes are asked for at 3× their size in points.
const DENSITY = 3;

const isCloudinary = (url) => Boolean(withTransformation(url, 'f_auto'));

// The copies that exist beside `url`, largest last, or null when it is not one.
function storedCopies(url) {
  const match = typeof url === 'string' ? DISPLAY_COPY.exec(url) : null;
  if (!match) return null;
  const [, base, width] = match;
  const widths = Number(width) === WIDE_WIDTHS[WIDE_WIDTHS.length - 1] ? WIDE_WIDTHS : [Number(width)];
  return { base, widths };
}

// The smallest stored copy that still fills the box; the largest when none is
// big enough, since no copy is ever upscaled to order.
export function sizedImage(url, { width }) {
  if (isCloudinary(url)) return cloudinaryImage(url, { width });
  const copies = storedCopies(url);
  if (!copies) return url;
  const wanted = Math.round(width * DENSITY);
  const chosen = copies.widths.find((candidate) => candidate >= wanted) ?? copies.widths[copies.widths.length - 1];
  return `${copies.base}_w${chosen}.webp`;
}
