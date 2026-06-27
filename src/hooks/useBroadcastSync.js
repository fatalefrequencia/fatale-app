import { useEffect, useRef, useCallback } from 'react';
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
  // Keep mutable refs for all props that can change, to avoid stale closures
  // without re-subscribing the SignalR listener every render.
  const youtubePlayerRef = useRef(youtubePlayer);
  const audioRefRef = useRef(audioRef);
  const setIsPlayingRef = useRef(setIsPlaying);
  const setCurrentTimeRef = useRef(setCurrentTime);
  const setBroadcastTrackRef = useRef(setBroadcastTrack);
  const setIsYoutubeModeRef = useRef(setIsYoutubeMode);
  const setBroadcastSourceTypeRef = useRef(setBroadcastSourceType);

  // Sync all refs on every render
  useEffect(() => {
    youtubePlayerRef.current = youtubePlayer;
    audioRefRef.current = audioRef;
    setIsPlayingRef.current = setIsPlaying;
    setCurrentTimeRef.current = setCurrentTime;
    setBroadcastTrackRef.current = setBroadcastTrack;
    setIsYoutubeModeRef.current = setIsYoutubeMode;
    setBroadcastSourceTypeRef.current = setBroadcastSourceType;
  });

  // Track the last loaded src to avoid redundant audio.load() calls
  const lastLoadedSrcRef = useRef(null);

  useEffect(() => {
    if (!activeStation || isHost) return;

    const stationId = activeStation.id || activeStation.Id;
    joinStation(stationId);

    const unsub = onBroadcastSync((payload) => {
      if (!payload) return;

      const now = Date.now();
      // Throttle rapid-fire duplicate sync events (150ms debounce)
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

      setBroadcastTrackRef.current(track);

      // Surface the source type so the UI and WebRTC listener can react
      if (typeof setBroadcastSourceTypeRef.current === 'function') {
        setBroadcastSourceTypeRef.current(sourceType || 'app');
      }

      const isYT = !!(youtubeId || (source && source.startsWith('youtube:')));

      // ── Hardware mode (external device): audio comes via WebRTC ──────────────
      if (sourceType === 'hardware' && !isYT) {
        // Request WebRTC stream (idempotent — signalr handles dedup)
        requestStream(String(stationId));

        // Clear any srcObject so WebRTC hook can attach its stream later
        const audio = audioRefRef.current?.current;
        if (audio && !audio.srcObject) {
          // Nothing to clear yet — WebRTC hook will attach srcObject
        }
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.pauseVideo === 'function') {
          try { youtubePlayerRef.current.pauseVideo(); } catch (e) {}
        }
        setIsPlayingRef.current(isPlaying);
        setCurrentTimeRef.current(currentTime || 0);
        return;
      }

      // ── Clear any lingering WebRTC stream (not in hardware mode) ─────────────
      const audio = audioRefRef.current?.current;
      if (audio && audio.srcObject) {
        audio.srcObject = null;
      }

      setIsYoutubeModeRef.current(isYT);

      // ── YouTube track sync (app mode) ─────────────────────────────────────────
      if (isYT) {
        const ytPlayer = youtubePlayerRef.current;
        if (ytPlayer) {
          try {
            const ytId = youtubeId || source?.split(':')[1];
            if (ytId) {
              const state = ytPlayer.getPlayerState?.();
              const currentVideoId = ytPlayer.getVideoData?.()?.video_id;

              if (currentVideoId !== ytId) {
                // Different track — load from broadcast time position
                ytPlayer.loadVideoById({ videoId: ytId, startSeconds: currentTime || 0 });
              } else {
                // Same track — only seek if significantly out of sync
                const diff = Math.abs((ytPlayer.getCurrentTime?.() || 0) - (currentTime || 0));
                if (diff > 2) ytPlayer.seekTo(currentTime, true);
              }

              if (isPlaying) {
                try {
                  ytPlayer.playVideo();
                  // Autoplay fallback: if blocked by browser policy, retry muted
                  setTimeout(() => {
                    const s = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
                    if (s !== 1 && s !== 3) {
                      console.log('[YOUTUBE_AUTOPLAY] Broadcast sync play blocked, retrying muted');
                      ytPlayer.mute?.();
                      ytPlayer.playVideo?.();
                    }
                  }, 350);
                } catch (err) {
                  console.warn('[BROADCAST_SYNC] playVideo error:', err);
                }
              } else {
                ytPlayer.pauseVideo();
              }
            }

            // Mobile session persistence: silent carrier keeps audio session alive
            if (audio) {
              const silentSrc = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
              if (audio.getAttribute('data-playing-src') !== 'silent') {
                audio.src = silentSrc;
                audio.loop = true;
                audio.setAttribute('data-playing-src', 'silent');
                audio.load();
              }
              if (isPlaying) audio.play().catch(() => {});
              else audio.pause();
            }
          } catch (e) {
            console.warn('[BROADCAST_SYNC] YouTube sync error:', e);
          }
        }

        setCurrentTimeRef.current(currentTime || 0);
        setIsPlayingRef.current(isPlaying);
        return;
      }

      // ── Native audio track sync (app mode, direct deck stream) ───────────────
      if (!isYT && audio && source) {
        const resolvedSrc = getMediaUrl(source);

        if (!resolvedSrc) {
          console.warn('[BROADCAST_SYNC] Could not resolve source URL:', source);
          setCurrentTimeRef.current(currentTime || 0);
          setIsPlayingRef.current(isPlaying);
          return;
        }

        const alreadyLoaded = lastLoadedSrcRef.current === resolvedSrc;

        if (!alreadyLoaded) {
          // New track — load and play
          lastLoadedSrcRef.current = resolvedSrc;
          audio.pause();
          audio.src = resolvedSrc;
          audio.loop = false;
          audio.setAttribute('data-playing-src', resolvedSrc);

          const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay);
            // Seek to current broadcast time before playing
            const diff = Math.abs((audio.currentTime || 0) - (currentTime || 0));
            if (diff > 0.5) {
              audio.currentTime = currentTime || 0;
            }
            if (isPlaying) {
              audio.play().catch(e => {
                console.error('[BROADCAST_SYNC] Playback failed after load:', resolvedSrc, e);
              });
            }
          };

          const onError = (e) => {
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('error', onError);
            console.error('[BROADCAST_SYNC] Audio load error for source:', resolvedSrc, e);
          };

          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('error', onError, { once: true });
          audio.load();
        } else {
          // Same track — sync time and play state
          const diff = Math.abs((audio.currentTime || 0) - (currentTime || 0));
          if (diff > 2) {
            audio.currentTime = currentTime || 0;
          }
          if (isPlaying) {
            if (audio.paused) {
              audio.play().catch(e => {
                console.error('[BROADCAST_SYNC] Resume failed:', e);
              });
            }
          } else {
            if (!audio.paused) audio.pause();
          }
        }
      } else if (!source && !isYT) {
        // Null source: host hasn't loaded a track yet — just sync state
      }

      setCurrentTimeRef.current(currentTime || 0);
      setIsPlayingRef.current(isPlaying);
    });

    return () => {
      lastLoadedSrcRef.current = null; // Reset when leaving station
      if (typeof unsub === 'function') unsub();
    };
    // Only re-subscribe when station or host status changes — refs handle the rest
  }, [activeStation?.id, isHost]);
}