// Generates the app's launcher, splash and Play Store images from the one
// brand file the design owns: frontend/public/brand/khelscore-logo-512.png
// (the KhelScore mark on white).
//
//   node scripts/makeBrandAssets.js
//
// Why a script and not hand-made files: every image below is the same mark at a
// different size and padding, and Android's adaptive icon crops anything
// outside a circle of 66/108 of the canvas. Deriving them keeps the paddings
// right and makes a new brand file a one-command update.
//
// The source has an opaque white background. Each pixel is un-multiplied
// against white — alpha from how far the darkest channel is from white — so the
// mark keeps its exact colours on white and also sits correctly on the dark
// splash background. Written with jimp (bundled with @expo/image-utils); no
// native image library is needed.
const fs = require('node:fs');
const path = require('node:path');
const Jimp = require('jimp-compact');

const MOBILE_DIR = path.resolve(__dirname, '..');
const SOURCE = path.resolve(
  process.env.FRONTEND_DIR ?? path.join(MOBILE_DIR, '..', 'frontend'),
  'public/brand/khelscore-logo-512.png',
);
const IMAGES_DIR = path.join(MOBILE_DIR, 'assets/images');
const STORE_DIR = path.join(MOBILE_DIR, 'assets/store');

// Brand surfaces (frontend/src/index.css) — kept in step with app.config.js.
const SPLASH_LIGHT = '#FAF8F5';
const WHITE = 0xffffffff;

// Android adaptive icons show only the middle 66/108 of the foreground, so the
// furthest ink pixel is kept just inside that circle.
const ADAPTIVE_SAFE_RADIUS = (33 / 108) * 0.98;

function unmultiplyWhite(image) {
  const { data, width, height } = image.bitmap;
  let maxAlpha = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = 1 - Math.min(data[i], data[i + 1], data[i + 2]) / 255;
    if (alpha > maxAlpha) maxAlpha = alpha;
  }
  if (maxAlpha === 0) throw new Error(`${SOURCE} looks blank`);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = Math.min(1, (1 - Math.min(data[i], data[i + 1], data[i + 2]) / 255) / maxAlpha);
    for (let channel = 0; channel < 3; channel += 1) {
      data[i + channel] =
        alpha === 0
          ? 255
          : Math.max(0, Math.min(255, Math.round((data[i + channel] - (1 - alpha) * 255) / alpha)));
    }
    data[i + 3] = Math.round(alpha * 255);
  }
  return { image, width, height };
}

// The tightest box around anything that is not fully transparent.
function inkBounds(image) {
  const { data, width, height } = image.bitmap;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// How far the furthest ink pixel sits from the middle of the mark. Scaling by
// this, rather than by the bounding box, is what keeps a diagonal mark inside
// a round launcher mask without shrinking it needlessly.
function inkRadius(mark) {
  const { data, width, height } = mark.bitmap;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  let radius = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) radius = Math.max(radius, Math.hypot(x - cx, y - cy));
    }
  }
  return radius;
}

// The mark centred on a `size` canvas. `radius` scales by the furthest ink
// pixel (for a mask-safe circle); otherwise `scale` fits the bounding box.
function compose(mark, { size, background, scale, radius }) {
  const canvas = new Jimp(size, size, background);
  const source = mark.clone();
  const factor = radius
    ? (size * radius) / inkRadius(source)
    : (size * scale) / Math.max(source.bitmap.width, source.bitmap.height);
  source.resize(
    Math.round(source.bitmap.width * factor),
    Math.round(source.bitmap.height * factor),
  );
  canvas.composite(
    source,
    Math.round((size - source.bitmap.width) / 2),
    Math.round((size - source.bitmap.height) / 2),
  );
  return canvas;
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Brand source not found: ${SOURCE} (set FRONTEND_DIR).`);
    process.exit(2);
  }
  fs.mkdirSync(STORE_DIR, { recursive: true });

  const source = await Jimp.read(SOURCE);
  unmultiplyWhite(source);
  const bounds = inkBounds(source);
  const mark = source.clone().crop(bounds.x, bounds.y, bounds.w, bounds.h);

  const outputs = [
    // Launcher foreground: transparent, inside the adaptive-icon safe circle.
    // app.config.js paints the background white behind it.
    [
      path.join(IMAGES_DIR, 'adaptive-icon.png'),
      compose(mark, { size: 1024, background: 0x00000000, radius: ADAPTIVE_SAFE_RADIUS }),
    ],
    // Splash: transparent, so the light and dark splash colours show through.
    [
      path.join(IMAGES_DIR, 'splash-icon.png'),
      compose(mark, { size: 1024, background: 0x00000000, scale: 0.8 }),
    ],
    // Legacy launcher icon and the Play Store listing icon: on white, exactly
    // 512×512 as the Play Console requires.
    [
      path.join(IMAGES_DIR, 'icon.png'),
      compose(mark, { size: 512, background: WHITE, scale: 0.7 }),
    ],
    [
      path.join(STORE_DIR, 'play-icon-512.png'),
      compose(mark, { size: 512, background: WHITE, scale: 0.7 }),
    ],
  ];

  for (const [file, image] of outputs) {
    await image.writeAsync(file);
    console.log(
      `wrote ${path.relative(MOBILE_DIR, file)} (${image.bitmap.width}×${image.bitmap.height})`,
    );
  }

  // Play feature graphic: 1024×500, the mark on the light brand surface. A
  // placeholder the owner is expected to replace with real artwork.
  const feature = new Jimp(1024, 500, Jimp.cssColorToHex(SPLASH_LIGHT));
  const badge = mark.clone();
  const badgeFactor = 300 / Math.max(badge.bitmap.width, badge.bitmap.height);
  badge.resize(
    Math.round(badge.bitmap.width * badgeFactor),
    Math.round(badge.bitmap.height * badgeFactor),
  );
  feature.composite(
    badge,
    Math.round((1024 - badge.bitmap.width) / 2),
    Math.round((500 - badge.bitmap.height) / 2),
  );
  const featureFile = path.join(STORE_DIR, 'play-feature-graphic-1024x500.png');
  await feature.writeAsync(featureFile);
  console.log(
    `wrote ${path.relative(MOBILE_DIR, featureFile)} (1024×500) — placeholder, replace with artwork`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
