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

  // ── Mutable refs so the SignalR callback always reads current props ─────────
  const youtubePlayerRef = useRef(youtubePlayer);
  const audioRefRef      = useRef(audioRef);
  const setIsPlayingRef          = useRef(setIsPlaying);
  const setCurrentTimeRef        = useRef(setCurrentTime);
  const setBroadcastTrackRef     = useRef(setBroadcastTrack);
  const setIsYoutubeModeRef      = useRef(setIsYoutubeMode);
  const setBroadcastSourceTypeRef = useRef(setBroadcastSourceType);

  useEffect(() => {
    youtubePlayerRef.current         = youtubePlayer;
    audioRefRef.current              = audioRef;
    setIsPlayingRef.current          = setIsPlaying;
    setCurrentTimeRef.current        = setCurrentTime;
    setBroadcastTrackRef.current     = setBroadcastTrack;
    setIsYoutubeModeRef.current      = setIsYoutubeMode;
    setBroadcastSourceTypeRef.current = setBroadcastSourceType;
  });

  // Track last-loaded native src and YouTube ID so we don't re-load the same content
  const lastLoadedSrcRef   = useRef(null);
  const lastLoadedYtIdRef  = useRef(null);
  // Track the current broadcast mode so we can clean up when switching
  const lastModeRef = useRef(null); // 'youtube' | 'native' | 'hardware' | null

  // ── Helper: stop native audio and clear its source ────────────────────────
  const stopNativeAudio = () => {
    const audio = audioRefRef.current?.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.srcObject = null;
    audio.setAttribute('data-playing-src', '');
    lastLoadedSrcRef.current = null;
  };

  // ── Helper: stop the YouTube player ───────────────────────────────────────
  const stopYouTube = () => {
    const ytPlayer = youtubePlayerRef.current;
    if (!ytPlayer) return;
    try {
      ytPlayer.pauseVideo();
    } catch (e) {}
  };

  // ── Helper: set a silent carrier on the native audio element ──────────────
  const setSilentCarrier = () => {
    const audio = audioRefRef.current?.current;
    if (!audio) return;
    const silentSrc = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    if (audio.getAttribute('data-playing-src') === 'silent') return;
    audio.pause();
    audio.src = silentSrc;
    audio.loop = true;
    audio.setAttribute('data-playing-src', 'silent');
    audio.load();
  };

  useEffect(() => {
    if (!activeStation || isHost) return;

    const stationId = activeStation.id || activeStation.Id;
    joinStation(stationId);

    const unsub = onBroadcastSync((payload) => {
      if (!payload) return;

      const now = Date.now();
      // Throttle duplicate rapid-fire syncs (150 ms debounce)
      if (lastSyncRef.current && now - lastSyncRef.current < 150) return;
      lastSyncRef.current = now;

      const {
        title, artist, cover, source, youtubeId,
        currentTime, isPlaying, sourceType,
        crossfader,
        broadcastVolume,  // host fader level (0-1)
        broadcastPitch,   // host pitch offset (semitones)
        broadcastBpm,     // host BPM for display
      } = payload;

      const track = { title, artist, cover, source, youtubeId, sourceType, isBroadcast: true };
      setBroadcastTrackRef.current(track);

      if (typeof setBroadcastSourceTypeRef.current === 'function') {
        setBroadcastSourceTypeRef.current(sourceType || 'app');
      }

      const isYT = !!(youtubeId || (source && source.startsWith('youtube:')));

      // ── Hardware mode: audio comes via WebRTC ────────────────────────────
      if (sourceType === 'hardware' && !isYT) {
        requestStream(String(stationId));
        stopYouTube();
        lastModeRef.current = 'hardware';
        setIsPlayingRef.current(isPlaying);
        setCurrentTimeRef.current(currentTime || 0);
        return;
      }

      // ── Clear WebRTC stream (not in hardware mode) ────────────────────────
      const audio = audioRefRef.current?.current;
      if (audio && audio.srcObject) {
        audio.srcObject = null;
      }

      setIsYoutubeModeRef.current(isYT);

      // ── YouTube track ─────────────────────────────────────────────────────
      if (isYT) {
        // Stop native audio and replace with silent carrier before playing YouTube
        if (lastModeRef.current !== 'youtube') {
          stopNativeAudio();
          setSilentCarrier();
        }
        lastModeRef.current = 'youtube';

        const ytPlayer = youtubePlayerRef.current;
        if (ytPlayer) {
          try {
            const ytId = youtubeId || source?.split(':')[1];
            if (ytId) {
              const currentVideoId = ytPlayer.getVideoData?.()?.video_id;

              if (currentVideoId !== ytId || lastLoadedYtIdRef.current !== ytId) {
                // New track — load at broadcast time
                lastLoadedYtIdRef.current = ytId;
                ytPlayer.loadVideoById({ videoId: ytId, startSeconds: currentTime || 0 });
                // loadVideoById auto-plays; if host is paused we stop after a brief moment
                if (!isPlaying) {
                  setTimeout(() => {
                    try { ytPlayer.pauseVideo(); } catch (e) {}
                  }, 300);
                }
              } else {
                // Same track — sync time if drifted
                const diff = Math.abs((ytPlayer.getCurrentTime?.() || 0) - (currentTime || 0));
                if (diff > 2) ytPlayer.seekTo(currentTime, true);

                if (isPlaying) {
                  try {
                    ytPlayer.playVideo();
                    // Autoplay protection fallback
                    setTimeout(() => {
                      const s = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
                      if (s !== 1 && s !== 3) {
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
                // Apply host volume level to YouTube player
                if (typeof broadcastVolume === 'number') {
                  ytPlayer.setVolume(broadcastVolume * 100);
                }

              }

              // Keep audio session alive on mobile with silent carrier
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
            }
          } catch (e) {
            console.warn('[BROADCAST_SYNC] YouTube sync error:', e);
          }
        }

        setCurrentTimeRef.current(currentTime || 0);
        setIsPlayingRef.current(isPlaying);
        return;
      }

      // ── Native audio track ────────────────────────────────────────────────
      if (source && audio) {
        // Stop YouTube if we were in YouTube mode
        if (lastModeRef.current === 'youtube') {
          stopYouTube();
          lastLoadedYtIdRef.current = null;
        }
        lastModeRef.current = 'native';

        const resolvedSrc = getMediaUrl(source);
        if (!resolvedSrc) {
          setCurrentTimeRef.current(currentTime || 0);
          setIsPlayingRef.current(isPlaying);
          return;
        }

        const alreadyLoaded = lastLoadedSrcRef.current === resolvedSrc;

        if (!alreadyLoaded) {
          // New track — load then play
          lastLoadedSrcRef.current = resolvedSrc;
          audio.pause();
          audio.src = resolvedSrc;
          audio.loop = false;
          audio.setAttribute('data-playing-src', resolvedSrc);

          const onCanPlay = () => {
            const diff = Math.abs((audio.currentTime || 0) - (currentTime || 0));
            if (diff > 0.5) audio.currentTime = currentTime || 0;
            if (isPlaying) {
              audio.play().catch(e => {
                console.error('[BROADCAST_SYNC] Playback failed:', resolvedSrc, e);
              });
            }
          };

          const onError = (e) => {
            console.error('[BROADCAST_SYNC] Audio load error:', resolvedSrc, e);
          };

          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('error', onError, { once: true });
          audio.load();
        } else {
          // Same track — sync play state
          const diff = Math.abs((audio.currentTime || 0) - (currentTime || 0));
          if (diff > 2) audio.currentTime = currentTime || 0;

          if (isPlaying) {
            if (audio.paused) {
              audio.play().catch(e => console.error('[BROADCAST_SYNC] Resume failed:', e));
            }
          } else {
            if (!audio.paused) audio.pause();
          }
        }
      }

      setCurrentTimeRef.current(currentTime || 0);
      setIsPlayingRef.current(isPlaying);
    });

    return () => {
      // Clean up all audio when leaving the station
      lastLoadedSrcRef.current  = null;
      lastLoadedYtIdRef.current = null;
      lastModeRef.current       = null;
      if (typeof unsub === 'function') unsub();
    };

  // Only re-subscribe when station or host status changes — refs handle the rest
  }, [activeStation?.id, isHost]);
}