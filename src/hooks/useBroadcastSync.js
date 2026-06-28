import { useEffect, useRef } from 'react';
import { requestStream } from '../services/signalr';
import { getMediaUrl } from '../constants';

export function useBroadcastSync({
  activeStation,
  audioRef,
  youtubePlayer,
  youtubePlayerB,
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
  const youtubePlayerBRef = useRef(youtubePlayerB);
  const audioRefRef      = useRef(audioRef);
  const setIsPlayingRef          = useRef(setIsPlaying);
  const setCurrentTimeRef        = useRef(setCurrentTime);
  const setBroadcastTrackRef     = useRef(setBroadcastTrack);
  const setIsYoutubeModeRef      = useRef(setIsYoutubeMode);
  const setBroadcastSourceTypeRef = useRef(setBroadcastSourceType);

  useEffect(() => {
    youtubePlayerRef.current         = youtubePlayer;
    youtubePlayerBRef.current        = youtubePlayerB;
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
  const lastModeRef = useRef(null); // 'youtube' | 'native' | 'hardware' | null

  // Secondary audio element for Deck B
  const deckBAudioRef = useRef(new Audio());
  const lastLoadedSrcBRef = useRef(null);
  const lastLoadedYtIdBRef = useRef(null);
  const lastModeBRef = useRef(null);

  // ── Helper: stop native audio and clear its source ────────────────────────
  const stopNativeAudio = (audioElement, lastLoadedRef) => {
    const audio = audioElement;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.srcObject = null;
    audio.setAttribute('data-playing-src', '');
    lastLoadedRef.current = null;
  };

  // ── Helper: stop the YouTube player ───────────────────────────────────────
  const stopYouTube = (ytPlayerRef) => {
    const ytPlayer = ytPlayerRef.current;
    if (!ytPlayer) return;
    try {
      ytPlayer.pauseVideo();
    } catch (e) {}
  };

  // ── Helper: set a silent carrier on the native audio element ──────────────
  const setSilentCarrier = (audioElement) => {
    const audio = audioElement;
    if (!audio) return;
    const silentSrc = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    if (audio.getAttribute('data-playing-src') === 'silent') return;
    audio.pause();
    audio.src = silentSrc;
    audio.loop = true;
    audio.setAttribute('data-playing-src', 'silent');
    audio.load();
  };

  const processDeck = (deckPayload, audioEl, ytPlayerRef, modeRef, loadedSrcRef, loadedYtIdRef) => {
    if (!deckPayload) {
      stopNativeAudio(audioEl, loadedSrcRef);
      stopYouTube(ytPlayerRef);
      modeRef.current = null;
      return;
    }

    const { track, currentTime, isPlaying, volume } = deckPayload;
    if (!track) return;

    const source = track.source || track.Source;
    const youtubeId = track.youtubeId || track.YoutubeId;
    const isYT = !!(youtubeId || (source && source.startsWith('youtube:')));

    if (isYT) {
      if (modeRef.current !== 'youtube') {
        stopNativeAudio(audioEl, loadedSrcRef);
        setSilentCarrier(audioEl);
      }
      modeRef.current = 'youtube';

      const ytPlayer = ytPlayerRef.current;
      if (ytPlayer) {
        try {
          const ytId = youtubeId || source?.split(':')[1];
          if (ytId) {
            const currentVideoId = ytPlayer.getVideoData?.()?.video_id;

            if (currentVideoId !== ytId || loadedYtIdRef.current !== ytId) {
              loadedYtIdRef.current = ytId;
              if (typeof volume === 'number') {
                try { ytPlayer.setVolume(volume * 100); } catch(e) {}
              }
              if (isPlaying) {
                // loadVideoById auto-plays — only use when deck IS playing
                ytPlayer.loadVideoById({ videoId: ytId, startSeconds: currentTime || 0 });
              } else {
                // cueVideoById loads without auto-playing
                try { ytPlayer.cueVideoById({ videoId: ytId, startSeconds: currentTime || 0 }); } catch(e) {}
              }
            } else {
              const diff = Math.abs((ytPlayer.getCurrentTime?.() || 0) - (currentTime || 0));
              if (diff > 2) ytPlayer.seekTo(currentTime, true);

              if (isPlaying) {
                try {
                  ytPlayer.playVideo();
                  setTimeout(() => {
                    const s = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
                    if (s !== 1 && s !== 3) {
                      ytPlayer.mute?.();
                      ytPlayer.playVideo?.();
                    }
                  }, 350);
                } catch (err) {}
              } else {
                ytPlayer.pauseVideo();
              }
              if (typeof volume === 'number') ytPlayer.setVolume(volume * 100);
            }

            if (audioEl) {
              const silentSrc = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
              if (audioEl.getAttribute('data-playing-src') !== 'silent') {
                audioEl.src = silentSrc;
                audioEl.loop = true;
                audioEl.setAttribute('data-playing-src', 'silent');
                audioEl.load();
              }
              if (isPlaying) audioEl.play().catch(() => {});
              else audioEl.pause();
            }
          }
        } catch (e) { console.warn('[BROADCAST_SYNC] YT sync error:', e); }
      }
    } else if (source && audioEl) {
      if (modeRef.current === 'youtube') {
        stopYouTube(ytPlayerRef);
        loadedYtIdRef.current = null;
      }
      modeRef.current = 'native';

      const resolvedSrc = getMediaUrl(source);
      if (!resolvedSrc) return;

      if (typeof volume === 'number') {
        audioEl.volume = Math.max(0, Math.min(1, volume));
      }

      if (loadedSrcRef.current !== resolvedSrc) {
        loadedSrcRef.current = resolvedSrc;
        audioEl.pause();
        audioEl.src = resolvedSrc;
        audioEl.loop = false;
        audioEl.setAttribute('data-playing-src', resolvedSrc);

        const onCanPlay = () => {
          const diff = Math.abs((audioEl.currentTime || 0) - (currentTime || 0));
          if (diff > 0.5) audioEl.currentTime = currentTime || 0;
          if (isPlaying) {
            audioEl.play().catch(e => console.error('[BROADCAST_SYNC] Playback failed:', resolvedSrc, e));
          }
        };

        const onError = (e) => console.error('[BROADCAST_SYNC] Audio load error:', resolvedSrc, e);

        audioEl.addEventListener('canplay', onCanPlay, { once: true });
        audioEl.addEventListener('error', onError, { once: true });
        audioEl.load();
      } else {
        const diff = Math.abs((audioEl.currentTime || 0) - (currentTime || 0));
        if (diff > 2) audioEl.currentTime = currentTime || 0;

        if (isPlaying) {
          if (audioEl.paused) audioEl.play().catch(e => {});
        } else {
          if (!audioEl.paused) audioEl.pause();
        }
      }
    }
  };

  useEffect(() => {
    if (!activeStation || isHost) return;

    const stationId = activeStation.id || activeStation.Id;
    joinStation(stationId);

    const unsub = onBroadcastSync((payload) => {
      if (!payload) return;

      const now = Date.now();
      if (lastSyncRef.current && now - lastSyncRef.current < 150) return;
      lastSyncRef.current = now;

      const {
        title, artist, cover, source, youtubeId,
        currentTime, isPlaying, sourceType,
        broadcastVolume, deckB
      } = payload;

      const track = { title, artist, cover, source, youtubeId, sourceType, isBroadcast: true };
      setBroadcastTrackRef.current(track);

      if (typeof setBroadcastSourceTypeRef.current === 'function') {
        setBroadcastSourceTypeRef.current(sourceType || 'app');
      }

      const isYT = !!(youtubeId || (source && source.startsWith('youtube:')));
      const audioEl = audioRefRef.current?.current;

      if (sourceType === 'hardware' && !isYT) {
        requestStream(String(stationId));
        stopYouTube(youtubePlayerRef);
        stopYouTube(youtubePlayerBRef);
        stopNativeAudio(deckBAudioRef.current, lastLoadedSrcBRef);
        lastModeRef.current = 'hardware';
        setIsPlayingRef.current(isPlaying);
        setCurrentTimeRef.current(currentTime || 0);
        return;
      }

      if (audioEl && audioEl.srcObject) {
        audioEl.srcObject = null;
      }

      setIsYoutubeModeRef.current(isYT);

      // Process Deck A (Primary)
      processDeck(
        { track, currentTime, isPlaying, volume: broadcastVolume },
        audioEl,
        youtubePlayerRef,
        lastModeRef,
        lastLoadedSrcRef,
        lastLoadedYtIdRef
      );
      
      setCurrentTimeRef.current(currentTime || 0);
      setIsPlayingRef.current(isPlaying);

      // Process Deck B (Secondary)
      processDeck(
        deckB,
        deckBAudioRef.current,
        youtubePlayerBRef,
        lastModeBRef,
        lastLoadedSrcBRef,
        lastLoadedYtIdBRef
      );
    });

    return () => {
      lastLoadedSrcRef.current  = null;
      lastLoadedYtIdRef.current = null;
      lastModeRef.current       = null;
      lastLoadedSrcBRef.current = null;
      lastLoadedYtIdBRef.current = null;
      lastModeBRef.current      = null;
      
      if (deckBAudioRef.current) deckBAudioRef.current.pause();
      
      if (typeof unsub === 'function') unsub();
    };
  }, [activeStation?.id, isHost]);
}