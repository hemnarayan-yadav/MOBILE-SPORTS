// Adapted from frontend/src/utils/cloudinary.js: the same delivery variants, for
// React Native's <Image>. Every image in the app is a Cloudinary upload stored
// as its original URL; screens ask here for a variant sized for the box it
// fills instead of downloading the original.

const IMAGE_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

// Inserts a transformation into a Cloudinary image URL; null for any other URL.
export function withTransformation(url, transformation) {
  const match = typeof url === 'string' ? url.match(IMAGE_UPLOAD) : null;
  return match ? `${match[1]}${transformation}/${match[2]}` : null;
}

// Phone screens are dense; boxes are asked for at 3× their size in points.
const DENSITY = 3;

// `limit`: scale down to fit, never up, never crop — logos, banners, photos.
// `fill`: an exact square crop around the subject — round avatars. Always the
// best format (f_auto) at automatic quality. Other URLs are returned unchanged.
export function cloudinaryImage(url, { width, crop = 'limit' }) {
  const size = Math.round(width * DENSITY);
  const fit = crop === 'fill' ? `c_fill,g_auto,w_${size},h_${size}` : `c_limit,w_${size}`;
  return withTransformation(url, `f_auto,q_auto,${fit}`) ?? url;
}

// Widths (points) of the boxes images are drawn in.
export const IMAGE_WIDTH = Object.freeze({
  hero: 420, // full-width banners on a phone
  card: 360, // card banners and covers
});
