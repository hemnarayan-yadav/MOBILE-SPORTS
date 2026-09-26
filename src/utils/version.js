// "1.2.3" versions compared numerically, part by part. Anything unparsable
// counts as 0.0.0, so a malformed value can never lock the app.
function parts(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(version ?? '').trim());
  return match ? match.slice(1).map(Number) : [0, 0, 0];
}

export function isVersionOlder(version, minimum) {
  const a = parts(version);
  const b = parts(minimum);
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}
