// The scoreboard's three sounds.
//
// The same takes the website's big display uses
// (frontend/public/audio → assets/audio here), so a ground hears the same
// siren whether the board is a laptop on the scorer's table or a phone on a
// monitor. Nothing is fetched: they are bundled with the app and play offline
// like the rest of the board.
//
//   siren     — tapped, end of a half or a called stoppage
//   do-or-die — tapped, the raid that has to produce
//   countdown — automatic, the last ten seconds of a raid (10 → 1)
//
// `expo-audio` is native, so it is loaded on demand inside a `try`, for the
// reason set out in lib/boardNative.js: a build made before it was added must
// still show a working board, silently, rather than failing to open.
//
// Players are created once and kept, because creating one costs a file read
// and the siren is tapped in the middle of a match.

import countdownTake from '../../assets/audio/kabaddi_10_second_raid.mp3';
import doOrDieTake from '../../assets/audio/do_or_die.mp3';
import sirenTake from '../../assets/audio/kabaddi_siren.mp3';

const SOURCES = Object.freeze({
  siren: sirenTake,
  doOrDie: doOrDieTake,
  countdown: countdownTake,
});

// The raid clock reading at which the countdown take begins. The take itself
// is ten seconds long and counts 10 down to 1, so it starts as the clock
// crosses ten and finishes at the whistle.
export const COUNTDOWN_AT_SECONDS = 10;

let audioModule;
let unavailable = false;
const players = new Map();

async function loadAudio() {
  if (unavailable) return null;
  if (!audioModule) {
    try {
      audioModule = await import('expo-audio');
    } catch {
      unavailable = true;
      return null;
    }
  }
  return audioModule;
}

async function playerFor(name) {
  if (players.has(name)) return players.get(name);
  const audio = await loadAudio();
  if (!audio) return null;
  try {
    const player = audio.createAudioPlayer(SOURCES[name]);
    players.set(name, player);
    return player;
  } catch {
    return null;
  }
}

/**
 * Plays one of the three takes from its beginning, replacing itself if it is
 * already playing — tapping the siren twice means two sirens, not one ignored.
 *
 * Resolves false when this build cannot play audio or the take failed; never
 * throws, because a sound that does not come out is not worth interrupting a
 * match over.
 */
export async function playBoardSound(name) {
  try {
    const player = await playerFor(name);
    if (!player) return false;
    player.seekTo(0);
    player.play();
    return true;
  } catch {
    return false;
  }
}

/** Stops the countdown, for a raid that ended before the whistle. */
export async function stopCountdown() {
  try {
    const player = players.get('countdown');
    if (!player) return;
    player.pause();
    player.seekTo(0);
  } catch {
    /* nothing playing */
  }
}

/** Frees the players when the board is closed. */
export function releaseBoardSounds() {
  for (const player of players.values()) {
    try {
      player.remove();
    } catch {
      /* already gone */
    }
  }
  players.clear();
}
