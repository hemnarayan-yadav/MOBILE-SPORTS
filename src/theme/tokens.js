// Design tokens — "Night Court & Mitti", ported from frontend/src/index.css
// (the CSS variables) and frontend/tailwind.config.js (radii). Ink surfaces for
// identity, one saffron accent, warm neutrals; red is reserved for LIVE and
// destructive actions. Values are the web's RGB triplets, unchanged.

const rgb = ([r, g, b], alpha = 1) =>
  alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;

const LIGHT = {
  bg: [250, 248, 245],
  surface: [255, 255, 255],
  surface2: [243, 239, 233],
  border: [229, 223, 214],
  text: [22, 26, 38],
  muted: [98, 103, 118],
  ink: [17, 26, 46],
  ink2: [30, 42, 70],
  onInk: [246, 243, 238],
  brand: [242, 107, 29],
  brandStrong: [194, 65, 12],
  brandSoft: [254, 236, 220],
  brandBtn: [194, 65, 12],
  onBrand: [255, 255, 255],
  live: [220, 38, 38],
  success: [21, 128, 61],
  warning: [161, 98, 7],
  danger: [185, 28, 28],
  info: [55, 84, 170],
  raider: [214, 84, 18],
  defender: [67, 72, 190],
  allrounder: [126, 64, 214],
  // Medals come in pairs: the fill a badge is filled with (dark `ink` text sits
  // on all three), and the `strong` variant a medal is written in — the fills
  // are far too light for small text here (gold is 2.8:1 on white). The bronze
  // fill was lifted from 176/106/48, which no text could sit on (4.09:1 with
  // ink); it now carries ink at 5.20:1.
  gold: [190, 150, 30],
  goldStrong: [146, 106, 8],
  silver: [140, 148, 160],
  silverStrong: [112, 116, 128],
  bronze: [196, 124, 62],
  bronzeStrong: [150, 82, 30],
};

const DARK = {
  bg: [9, 13, 22],
  surface: [17, 23, 36],
  surface2: [26, 33, 50],
  border: [40, 49, 70],
  text: [236, 238, 243],
  muted: [152, 160, 178],
  ink: [6, 10, 19],
  ink2: [22, 30, 50],
  onInk: [246, 243, 238],
  brand: [249, 128, 55],
  brandStrong: [251, 150, 80],
  brandSoft: [58, 32, 16],
  brandBtn: [249, 128, 55],
  onBrand: [17, 20, 30],
  live: [248, 96, 96],
  success: [74, 196, 120],
  warning: [234, 179, 60],
  danger: [248, 113, 113],
  info: [129, 160, 245],
  raider: [251, 146, 60],
  defender: [140, 150, 250],
  allrounder: [190, 140, 250],
  // On a dark surface every fill already carries ink (11.7 / 11.5 / 7.9) and
  // every medal is already legible written in as it is (10.6 / 10.4 / 7.2), so
  // here each `strong` variant is its own fill.
  gold: [232, 196, 80],
  goldStrong: [232, 196, 80],
  silver: [190, 198, 210],
  silverStrong: [190, 198, 210],
  bronze: [214, 150, 96],
  bronzeStrong: [214, 150, 96],
};

const toColors = (palette) =>
  Object.freeze({
    ...Object.fromEntries(Object.entries(palette).map(([name, value]) => [name, rgb(value)])),
    // The web's `border-live/40` on live match cards.
    liveBorder: rgb(palette.live, 0.4),
    // Text on the red LIVE badge (the web's `text-white`), in both themes.
    onLive: rgb([255, 255, 255]),
  });

export const COLORS = Object.freeze({ light: toColors(LIGHT), dark: toColors(DARK) });

export const RADII = Object.freeze({ sm: 8, md: 12, xl: 14, xxl: 20, full: 999 });

export const SPACING = Object.freeze({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 });

// Minimum touch target, as on the web (44 px).
export const MIN_TOUCH = 44;
