import { useEffect, useRef } from 'react';

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

      const { title, artist, cover, source, youtubeId, currentTime, isPlaying } = payload;

      const track = {
        title,
        artist,
        cover,
        source,
        youtubeId,
        isBroadcast: true,
      };

      setBroadcastTrack(track);

      const isYT = !!(youtubeId || (source && source.startsWith('youtube:')));
      setIsYoutubeMode(isYT);

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
        } catch (e) {
          console.warn('[BROADCAST_SYNC] YouTube sync error:', e);
        }
      } else if (!isYT && audioRef.current) {
        if (source && audioRef.current.getAttribute('data-playing-src') !== source) {
          audioRef.current.src = source;
          audioRef.current.load();
          audioRef.current.setAttribute('data-playing-src', source);
        }
        const diff = Math.abs((audioRef.current.currentTime || 0) - (currentTime || 0));
        if (diff > 2) audioRef.current.currentTime = currentTime || 0;
        if (isPlaying) audioRef.current.play().catch(() => {});
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