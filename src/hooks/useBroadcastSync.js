import { useEffect, useRef, useState } from 'react';
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
  setBroadcastDeckB,
  setIsYoutubeMode,
  setBroadcastSourceType,
  showNotification,
  joinStation,
  onBroadcastSync,
}) {
  const lastSyncRef = useRef(null);
  const lastSyncFingerprintRef = useRef(null);
  const lastPayloadRef = useRef(null); // stores last received payload for re-applying when players mount

  // Broadcast gain states — trigger App.jsx volume sync effect when crossfade moves
  const [broadcastGainA, setBroadcastGainA] = useState(1);
  const [broadcastGainB, setBroadcastGainB] = useState(1);
  // Also keep refs for access inside SignalR callbacks without stale closures
  const broadcastGainARef = useRef(1);
  const broadcastGainBRef = useRef(1);

  // ── Mutable refs so the SignalR callback always reads current props ─────────
  const youtubePlayerRef = useRef(youtubePlayer);
  const youtubePlayerBRef = useRef(youtubePlayerB);
  const audioRefRef      = useRef(audioRef);
  const setIsPlayingRef          = useRef(setIsPlaying);
  const setCurrentTimeRef        = useRef(setCurrentTime);
  const setBroadcastTrackRef     = useRef(setBroadcastTrack);
  const setBroadcastDeckBRef     = useRef(setBroadcastDeckB);
  const setIsYoutubeModeRef      = useRef(setIsYoutubeMode);
  const setBroadcastSourceTypeRef = useRef(setBroadcastSourceType);

  useEffect(() => {
    youtubePlayerRef.current         = youtubePlayer;
    youtubePlayerBRef.current        = youtubePlayerB;
    audioRefRef.current              = audioRef;
    setIsPlayingRef.current          = setIsPlaying;
    setCurrentTimeRef.current        = setCurrentTime;
    setBroadcastTrackRef.current     = setBroadcastTrack;
    setBroadcastDeckBRef.current     = setBroadcastDeckB;
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
    if (!deckPayload || !deckPayload.track) {
      stopNativeAudio(audioEl, loadedSrcRef);
      stopYouTube(ytPlayerRef);
      modeRef.current = null;
      return;
    }

    const { track, currentTime, isPlaying, volume } = deckPayload;

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
              if (isPlaying) {
                // Mute first to bypass browser autoplay policy, then unmute once playing
                try { ytPlayer.mute?.(); } catch(e) {}
                ytPlayer.loadVideoById({ videoId: ytId, startSeconds: currentTime || 0 });
                // After video starts, set volume and unmute
                const targetVolume = typeof volume === 'number' ? volume * 100 : 100;
                setTimeout(() => {
                  try {
                    const state = ytPlayer.getPlayerState?.();
                    if (state === 1 || state === 3) {
                      ytPlayer.setVolume?.(targetVolume);
                      ytPlayer.unMute?.();
                    } else {
                      // Still try to unmute even if state check fails
                      ytPlayer.setVolume?.(targetVolume);
                      ytPlayer.unMute?.();
                    }
                  } catch(e) {}
                }, 700);
              } else {
                // cueVideoById loads without auto-playing
                try { ytPlayer.cueVideoById({ videoId: ytId, startSeconds: currentTime || 0 }); } catch(e) {}
                if (typeof volume === 'number') {
                  try { ytPlayer.setVolume(volume * 100); } catch(e) {}
                }
              }
            } else {
              // Same video — only sync time and play state (and volume)
              const diff = Math.abs((ytPlayer.getCurrentTime?.() || 0) - (currentTime || 0));
              if (diff > 2) ytPlayer.seekTo(currentTime, true);

              if (typeof volume === 'number') {
                try { ytPlayer.setVolume(volume * 100); } catch(e) {}
              }

              if (isPlaying) {
                try {
                  ytPlayer.unMute?.();
                  ytPlayer.playVideo();
                  setTimeout(() => {
                    const s = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
                    if (s !== 1 && s !== 3) {
                      ytPlayer.mute?.();
                      ytPlayer.playVideo?.();
                      setTimeout(() => { try { ytPlayer.unMute?.(); } catch(e) {} }, 500);
                    }
                  }, 350);
                } catch (err) {}
              } else {
                try { ytPlayer.pauseVideo(); } catch(err) {}
              }
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

  // Re-apply last sync payload when YouTube players mount (they conditionally render so may mount AFTER payload arrives)
  useEffect(() => {
    if (!youtubePlayer) return;
    const payload = lastPayloadRef.current;
    if (!payload) return;
    const { source, youtubeId, currentTime, isPlaying, broadcastVolume } = payload;
    const track = { source, youtubeId, isBroadcast: true };
    const audioEl = audioRefRef.current?.current;
    // Pass player directly — ref may not yet be updated at this point
    const fakeRef = { current: youtubePlayer };
    processDeck(
      { track, currentTime, isPlaying, volume: broadcastVolume },
      audioEl,
      fakeRef,
      lastModeRef,
      lastLoadedSrcRef,
      lastLoadedYtIdRef
    );
  }, [youtubePlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!youtubePlayerB) return;
    const payload = lastPayloadRef.current;
    if (!payload || !payload.deckB) return;
    // Pass player directly — ref may not yet be updated at this point
    const fakeRef = { current: youtubePlayerB };
    processDeck(
      payload.deckB,
      deckBAudioRef.current,
      fakeRef,
      lastModeBRef,
      lastLoadedSrcBRef,
      lastLoadedYtIdBRef
    );
  }, [youtubePlayerB]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeStation || isHost) return;

    const stationId = activeStation.id || activeStation.Id;
    joinStation(stationId);

    const unsub = onBroadcastSync((payload) => {
      if (!payload) return;

      const now = Date.now();
      // Deduplicate identical back-to-back messages (same track + play state + deckB identity + volume)
      // but always let through syncs that change track identity, deck B identity, or volume/crossfade
      const deckBId = payload.deckB?.track?.id || payload.deckB?.track?.source || null;
      const fingerprint = `${payload.source}|${payload.isPlaying}|${deckBId}|${payload.deckB?.isPlaying}|${payload.crossfader}|${payload.broadcastVolume}|${payload.deckB?.volume}`;
      const isIdentical = lastSyncFingerprintRef.current === fingerprint;
      const isQuick = lastSyncRef.current && now - lastSyncRef.current < 80;
      // Drop only if identical AND arrived within 80ms (pure duplicate packet)
      if (isIdentical && isQuick) return;
      lastSyncRef.current = now;
      lastSyncFingerprintRef.current = fingerprint;
      lastPayloadRef.current = payload; // store last payload so we can re-apply when players mount

      const {
        title, artist, cover, source, youtubeId,
        currentTime, isPlaying, sourceType,
        broadcastVolume, crossfader, deckB
      } = payload;

      const track = { title, artist, cover, source, youtubeId, sourceType, isBroadcast: true };
      setBroadcastTrackRef.current(track);
      if (typeof setBroadcastDeckBRef.current === 'function') {
        setBroadcastDeckBRef.current(deckB || null);
      }

      // Track broadcaster's gain for each deck so App.jsx volume sync can incorporate it
      const newGainA = typeof broadcastVolume === 'number' ? Math.max(0, Math.min(1, broadcastVolume)) : 1;
      const newGainB = typeof deckB?.volume === 'number' ? Math.max(0, Math.min(1, deckB.volume)) : 1;
      broadcastGainARef.current = newGainA;
      broadcastGainBRef.current = newGainB;
      setBroadcastGainA(newGainA);
      setBroadcastGainB(newGainB);

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

      // Apply crossfader volume to Deck A's native audio immediately
      const audioElA = audioEl;
      if (audioElA && typeof broadcastVolume === 'number') {
        audioElA.volume = Math.max(0, Math.min(1, broadcastVolume));
      }

      // Process Deck A (Primary)
      processDeck(
        { track, currentTime, isPlaying, volume: broadcastVolume },
        audioElA,
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

  // Expose broadcast gains so App.jsx volume sync can apply the crossfade mix
  return { broadcastGainA, broadcastGainB, broadcastGainARef, broadcastGainBRef };
}