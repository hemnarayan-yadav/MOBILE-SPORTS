// Drift check between the mobile app and the web frontend it ports code from.
//
// The two apps are separate repositories, so shared logic is copied (with a
// "Ported from …" header) rather than imported. This script reports when the
// web source of a ported file has changed since it was ported, and when a
// translation shared by both apps no longer reads the same.
//
//   npm run drift                 check (exit 1 on drift)
//   npm run drift -- --update     record the current web sources as reviewed
//
// The web repository is expected next to this one (../frontend); set
// FRONTEND_DIR to use another checkout.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MOBILE_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.resolve(
  process.env.FRONTEND_DIR ?? path.join(MOBILE_DIR, '..', 'frontend'),
);
const MANIFEST = path.join(__dirname, 'ported-files.json');
const LOCALES = ['en', 'hi'];
// Mobile-only translations; everything else must match the web wording.
const MOBILE_ONLY_NAMESPACE = 'app';

// Line endings are normalized so a Windows checkout hashes like any other.
const hashFile = (file) =>
  crypto
    .createHash('sha256')
    .update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))
    .digest('hex');

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  );
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function checkPortedFiles(manifest, update) {
  const problems = [];
  for (const [mobileFile, entry] of Object.entries(manifest)) {
    const source = path.join(FRONTEND_DIR, entry.source);
    if (!fs.existsSync(path.join(MOBILE_DIR, mobileFile))) {
      problems.push(`${mobileFile}: listed but missing in the mobile app`);
      continue;
    }
    if (!fs.existsSync(source)) {
      problems.push(`${mobileFile}: web source ${entry.source} no longer exists`);
      continue;
    }
    const current = hashFile(source);
    if (update) entry.sha256 = current;
    else if (current !== entry.sha256) {
      problems.push(
        `${mobileFile}: web source ${entry.source} changed since it was ported — review and re-port`,
      );
    }
  }
  return problems;
}

function checkTranslations() {
  const problems = [];
  for (const lng of LOCALES) {
    const web = new Map(
      flatten(readJson(path.join(FRONTEND_DIR, 'src/i18n/locales', `${lng}.json`))),
    );
    const mobile = flatten(readJson(path.join(MOBILE_DIR, 'src/i18n/locales', `${lng}.json`)));
    for (const [key, value] of mobile) {
      if (key.startsWith(`${MOBILE_ONLY_NAMESPACE}.`)) continue;
      if (!web.has(key))
        problems.push(`${lng}: "${key}" is not a web key (mobile-only keys go under "app.")`);
      else if (web.get(key) !== value)
        problems.push(`${lng}: "${key}" differs from the web wording`);
    }
  }
  return problems;
}

function main() {
  const update = process.argv.includes('--update');
  if (!fs.existsSync(FRONTEND_DIR)) {
    console.error(`Web frontend not found at ${FRONTEND_DIR} (set FRONTEND_DIR).`);
    process.exit(2);
  }
  const manifest = readJson(MANIFEST);
  const problems = [...checkPortedFiles(manifest, update), ...checkTranslations()];
  if (update) {
    fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Recorded ${Object.keys(manifest).length} web sources as reviewed.`);
  }
  if (problems.length > 0) {
    console.error(
      `Drift found (${problems.length}):\n${problems.map((p) => `  - ${p}`).join('\n')}`,
    );
    process.exit(1);
  }
  console.log(
    `No drift: ${Object.keys(manifest).length} ported files and shared translations match the web.`,
  );
}

main();
