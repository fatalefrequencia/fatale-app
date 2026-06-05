import { useEffect, useRef } from 'react';
import { requestStream } from '../services/signalr';
import { getMediaUrl } from '../constants';

export function useBroadcastSync({
  activeStation,
  audioRef,
  youtubePlayer,
  isHost,
  setIsPlaying,
  setCurrentTime,
  setDuration,
  setBroadcastTrack,
  setIsYoutubeMode,
  setBroadcastSourceType,
  showNotification,
  joinStation,
  onBroadcastSync,
}) {
  const lastSyncRef = useRef(null);

  useEffect(() => {
    if (!activeStation || isHost) return;

    const stationId = activeStation.id || activeStation.Id;
    joinStation(stationId);

    const unsub = onBroadcastSync((payload) => {
      if (!payload) return;

      const now = Date.now();
      if (lastSyncRef.current && now - lastSyncRef.current < 150) return;
      lastSyncRef.current = now;

      const { title, artist, cover, source, youtubeId, currentTime, isPlaying, sourceType } = payload;

      const track = {
        title,
        artist,
        cover,
        source,
        youtubeId,
        sourceType,
        isBroadcast: true,
      };

      setBroadcastTrack(track);

      // Surface the source type so the UI and WebRTC listener can react
      if (typeof setBroadcastSourceType === 'function') {
        setBroadcastSourceType(sourceType || 'app');
      }

      // Request WebRTC audio stream for both hardware and app broadcast types
      if (sourceType === 'hardware' || sourceType === 'app') {
        requestStream(String(stationId));
      }

      const isYT = !!(youtubeId || (source && source.startsWith('youtube:')));
      setIsYoutubeMode(isYT);

      // Audio comes via WebRTC
      if (sourceType === 'hardware' || sourceType === 'app') {
        // Only pause the audio element if WebRTC has NOT yet provided a srcObject stream.
        // If srcObject is set, the WebRTC audio is already playing — don't interrupt it.
        if (audioRef.current && !audioRef.current.srcObject && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
          try {
            youtubePlayer.pauseVideo();
          } catch (e) {}
        }
        if (typeof isPlaying === 'boolean') setIsPlaying(isPlaying);
        if (typeof currentTime === 'number') setCurrentTime(currentTime);
        return;
      }

      // If we are not in hardware mode, make sure to clear any WebRTC stream
      if (audioRef.current && audioRef.current.srcObject) {
        audioRef.current.srcObject = null;
      }

      if (isYT && youtubePlayer) {
        try {
          const ytId = youtubeId || source?.split(':')[1];
          if (ytId) {
            const state = youtubePlayer.getPlayerState?.();
            if (state !== 1 && state !== 3) {
              youtubePlayer.loadVideoById({ videoId: ytId, startSeconds: currentTime || 0 });
            } else {
              const diff = Math.abs((youtubePlayer.getCurrentTime?.() || 0) - (currentTime || 0));
              if (diff > 2) youtubePlayer.seekTo(currentTime, true);
            }
            if (isPlaying) youtubePlayer.playVideo();
            else youtubePlayer.pauseVideo();
          }

          // Mobile session persistence: play silent carrier on audioRef
          if (audioRef.current) {
            const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
            if (audioRef.current.src !== silentSrc && audioRef.current.getAttribute('data-playing-src') !== 'silent') {
              audioRef.current.src = silentSrc;
              audioRef.current.loop = true;
              audioRef.current.setAttribute('data-playing-src', 'silent');
              audioRef.current.load();
            }
            if (isPlaying) {
              audioRef.current.play().catch(() => {});
            } else {
              audioRef.current.pause();
            }
          }
        } catch (e) {
          console.warn('[BROADCAST_SYNC] YouTube sync error:', e);
        }
      } else if (!isYT && audioRef.current) {
        const resolvedSrc = getMediaUrl(source);
        if (resolvedSrc && audioRef.current.getAttribute('data-playing-src') !== resolvedSrc) {
          audioRef.current.src = resolvedSrc;
          audioRef.current.load();
          audioRef.current.setAttribute('data-playing-src', resolvedSrc);
        }
        const diff = Math.abs((audioRef.current.currentTime || 0) - (currentTime || 0));
        if (diff > 2) audioRef.current.currentTime = currentTime || 0;
        if (isPlaying) {
          audioRef.current.play().catch(e => {
            console.error('[useBroadcastSync] Playback failed for source:', resolvedSrc, e);
          });
        }
        else audioRef.current.pause();
      }

      if (typeof currentTime === 'number') setCurrentTime(currentTime);
      if (typeof isPlaying === 'boolean') setIsPlaying(isPlaying);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [activeStation?.id, isHost, youtubePlayer]);
}