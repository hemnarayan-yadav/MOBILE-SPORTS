// Metro bundler configuration — Expo's defaults, plus one exclusion.
//
// expo-router's Android native tab bar can draw Material Symbols, and reaches
// them through expo-symbols, which statically imports
// `@expo-google-fonts/material-symbols`. That pulls a 967 KB font into every
// bundle. This app draws its tab icons with Ionicons (`@expo/vector-icons`) and
// never renders `NativeTabs`, so the font is dead weight: the request resolves
// to an empty module instead. If native tabs are ever adopted, delete this
// block — the icons would silently stop rendering otherwise.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const MATERIAL_SYMBOLS = /^@expo-google-fonts[\\/]material-symbols(?:[\\/]|$)/;

const ALIASES = {
  'react-native-device-info': path.resolve(__dirname, 'src/lib/deviceInfoShim.js'),
};

const config = getDefaultConfig(__dirname);

const inherited = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (MATERIAL_SYMBOLS.test(moduleName)) return { type: 'empty' };
  if (ALIASES[moduleName]) {
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      ALIASES[moduleName],
      platform,
    );
  }
  return (inherited ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
