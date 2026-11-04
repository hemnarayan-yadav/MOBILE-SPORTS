import Constants from 'expo-constants';

export function getBundleId() {
  return Constants.expoConfig?.android?.package ?? Constants.expoConfig?.ios?.bundleIdentifier ?? '';
}

export function getVersion() {
  return Constants.expoConfig?.version ?? '0.0.0';
}

export default { getBundleId, getVersion };
