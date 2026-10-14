// Adapted from frontend/src/utils/cloudinary.js: the same delivery variants, for
// React Native's <Image>. A Cloudinary upload is stored as its original URL and
// transformed on delivery, so a variant is just a URL. Screens do not come here
// directly: they ask utils/image.js, which also knows the copies the other
// storage provider stores at upload time.

const IMAGE_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

// Inserts a transformation into a Cloudinary image URL; null for any other URL.
export function withTransformation(url, transformation) {
  const match = typeof url === 'string' ? url.match(IMAGE_UPLOAD) : null;
  return match ? `${match[1]}${transformation}/${match[2]}` : null;
}

// Phone screens are dense; boxes are asked for at 3× their size in points.
const DENSITY = 3;

// `c_limit` scales down to fit and never up, and never crops: the whole image
// is always in the variant, whatever box it is drawn in. Always the best format
// (f_auto) at automatic quality. Other URLs are returned unchanged.
export function cloudinaryImage(url, { width }) {
  return withTransformation(url, `f_auto,q_auto,c_limit,w_${Math.round(width * DENSITY)}`) ?? url;
}

// Widths (points) of the boxes images are drawn in.
export const IMAGE_WIDTH = Object.freeze({
  hero: 420, // full-width banners on a phone
  card: 360, // card banners and covers
});
