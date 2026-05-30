// src/hooks/useBroadcastSync.js
import { useEffect, useRef } from 'react';
import { joinStation, onBroadcastSync } from '../services/signalr';

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
  showNotification,
}) {
  const lastSyncRef = useRef(null);

  useEffect(() => {
    if (!activeStation || isHost) return;

    const stationId = activeStation.id || activeStation.Id;
    joinStation(stationId);

    const unsub = onBroadcastSync((payload) => {
      if (!payload) return;

      // Debounce — ignore syncs within 150ms of the last one
      const now = Date.now();
      if (lastSyncRef.current && now - lastSyncRef.current < 150) return;
      lastSyncRef.current = now;

      const { track, currentTime, isPlaying } = payload;

      if (track) {
        setBroadcastTrack(track);
        const isYT = !!(track.youtubeId || (track.source && track.source.startsWith('youtube:')));
        setIsYoutubeMode(isYT);

        if (isYT && youtubePlayer) {
          try {
            const ytId = track.youtubeId || track.source?.split(':')[1];
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
          } catch (e) {
            console.warn('[BROADCAST_SYNC] YouTube sync error:', e);
          }
        } else if (!isYT && audioRef.current) {
          const src = track.source?.startsWith('http') ? track.source : track.source;
          if (src && audioRef.current.getAttribute('data-playing-src') !== src) {
            audioRef.current.src = src;
            audioRef.current.load();
            audioRef.current.setAttribute('data-playing-src', src);
          }
          const diff = Math.abs((audioRef.current.currentTime || 0) - (currentTime || 0));
          if (diff > 2) audioRef.current.currentTime = currentTime || 0;
          if (isPlaying) audioRef.current.play().catch(() => {});
          else audioRef.current.pause();
        }
      }

      if (typeof currentTime === 'number') setCurrentTime(currentTime);
      if (typeof isPlaying === 'boolean') setIsPlaying(isPlaying);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [activeStation?.id, isHost, youtubePlayer]);
}