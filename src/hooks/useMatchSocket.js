// Ported from frontend/src/hooks/useMatchSocket.js, plus the app's resume path
// (lib/socket.js `onResume`): back from the background with the socket still
// open, the screen asks for a fresh snapshot with `match:sync`.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { qk } from '../api/queryKeys.js';
import { recordServerTime } from '../lib/serverClock.js';
import { getMatchSocket, onResume } from '../lib/socket.js';

// A newer live version (or a status change such as upcoming → live) replaces
// the cached match; stale or duplicate events are ignored.
export function isNewerMatch(incoming, current) {
  if (!current) return true;
  if (incoming.status !== current.status) return true;
  return (incoming.live?.version ?? 0) >= (current.live?.version ?? 0);
}

// Subscribes the match detail query to its Socket.io room. On every connect or
// reconnect the room is (re)joined and the server's full snapshot replaces the
// cache, so a viewer who dropped offline is always resynchronised. The raid
// clock rides along in that snapshot: it is engine state, not a side channel.
export function useMatchSocket(matchId) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!matchId) return undefined;
    const socket = getMatchSocket();
    const key = qk.matches.detail(matchId);

    const apply = (match) =>
      queryClient.setQueryData(key, (current) => (isNewerMatch(match, current) ? match : current));
    // Join and sync answer with the full match; the round trip also measures
    // the device/server clock offset.
    const request = (event) => {
      const sentAt = Date.now();
      socket.emit(event, matchId, (res) => {
        if (!res?.ok) return;
        const serverTime = res.match?.live?.serverTime;
        if (serverTime) recordServerTime(serverTime, sentAt, Date.now());
        apply(res.match);
      });
    };
    const join = () => {
      setConnected(true);
      request('match:join');
    };
    const onUpdate = ({ match }) => match?.id === matchId && apply(match);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on('match:update', onUpdate);
    const stopResume = onResume(() => request('match:sync'));
    if (socket.connected) join();

    return () => {
      socket.emit('match:leave', matchId);
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off('match:update', onUpdate);
      stopResume();
    };
  }, [matchId, queryClient]);

  return { connected };
}
