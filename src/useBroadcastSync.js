import { useEffect, useRef, useCallback } from 'react';
import { onBroadcastSync, joinStation, leaveStation, initSignalR } from '../services/signalr';

/**
 * useBroadcastSync
 *
 * Drives listener-side playback entirely from SignalR BroadcastSync events.
 * Completely bypasses the library/queue track system — the station IS the source.
 *
 * Works for:
 *   sourceType === 'youtube'   → controls the YouTube iframe player
 *   sourceType === 'local'     → streams the track URL through audioRef
 *   sourceType === 'stream'    → points audioRef at an HLS/MPEG stream URL
 *   sourceType === 'hardware'  → streams whatever URL the host hardware outputs
 *
 * @param {object} params
 * @param {object|null}   params.activeStation   - station object or null
 * @param {React.ref}     params.audioRef         - the global <audio> ref
 * @param {object|null}   params.youtubePlayer    - YT iframe API player instance
 * @param {boolean}       params.isHost           - true if current user is the station host
 * @param {function}      params.setIsPlaying     - App state setter
 * @param {function}      params.setCurrentTime   - App state setter
 * @param {function}      params.setDuration      - App state setter
 * @param {function}      params.setBroadcastTrack - (trackMeta) => void — tells App what's on air
 * @param {function}      params.setIsYoutubeMode  - App state setter
 * @param {function}      params.showNotification  - notification helper
 */
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
  const currentSyncRef   = useRef(null);  // last received payload
  const loadedSourceRef  = useRef(null);  // what's currently loaded in audio/yt
  const latencyRef       = useRef(0);     // rolling latency estimate (ms)
  const syncThrottleRef  = useRef(null);

  // ─── Latency estimation ────────────────────────────────────────────────────
  // Simple: compare payload.timestamp to Date.now() at receipt time.
  const estimateLatency = (payload) => {
    const raw = Date.now() - (payload.timestamp || Date.now());
    // Clamp to reasonable range (network hiccups shouldn't cause massive jumps)
    latencyRef.current = Math.max(0, Math.min(raw, 5000));
  };

  // ─── Apply a sync payload to audio/yt ──────────────────────────────────────
  const applySyncPayload = useCallback((payload) => {
    if (!payload) return;
    if (isHost) return; // host never follows its own sync

    const { sourceType, youtubeId, source, streamUrl, isPlaying, currentTime, title, artist, cover } = payload;

    // Compensate for network latency
    const compensatedTime = (currentTime || 0) + (latencyRef.current / 1000);

    // ── Update broadcast track metadata (shown in MiniPlayer / NowPlaying) ──
    setBroadcastTrack({
      title,
      artist,
      cover,
      source: source || streamUrl || (youtubeId ? `youtube:${youtubeId}` : ''),
      youtubeId: youtubeId || null,
      isLiked:  false,
      isLocked: false,
      isOwned:  true,
      isBroadcast: true,
    });

    // ── YouTube mode ──────────────────────────────────────────────────────────
    if (sourceType === 'youtube' && youtubeId) {
      setIsYoutubeMode(true);

      if (youtubePlayer && typeof youtubePlayer.loadVideoById === 'function') {
        if (loadedSourceRef.current !== youtubeId) {
          loadedSourceRef.current = youtubeId;
          try {
            youtubePlayer.loadVideoById({ videoId: youtubeId, startSeconds: Math.max(0, compensatedTime) });
            youtubePlayer.setVolume(80);
          } catch (e) {
            console.warn('[BroadcastSync] YT loadVideoById failed:', e);
          }
        } else {
          // Same track — just sync position if drift > 3s
          try {
            const ytTime = youtubePlayer.getCurrentTime ? youtubePlayer.getCurrentTime() : 0;
            if (Math.abs(ytTime - compensatedTime) > 3) {
              youtubePlayer.seekTo(compensatedTime, true);
            }
          } catch (e) {}
        }

        // Sync play/pause
        try {
          const ytState = youtubePlayer.getPlayerState ? youtubePlayer.getPlayerState() : -1;
          if (isPlaying && ytState !== 1 && ytState !== 3) {
            youtubePlayer.playVideo();
          } else if (!isPlaying && ytState === 1) {
            youtubePlayer.pauseVideo();
          }
        } catch (e) {}
      }

      // Keep native audio element playing silent so Media Session API stays active
      _keepSilentCarrier(audioRef, isPlaying);
      setIsPlaying(isPlaying);
      setCurrentTime(compensatedTime);
      return;
    }

    // ── Stream / local / hardware mode ─────────────────────────────────────
    setIsYoutubeMode(false);

    if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
      try { youtubePlayer.pauseVideo(); } catch (e) {}
    }

    const targetSrc = streamUrl || source || '';
    if (!targetSrc) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (loadedSourceRef.current !== targetSrc) {
      loadedSourceRef.current = targetSrc;
      audio.src = targetSrc;
      audio.crossOrigin = 'anonymous';
      audio.load();

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
        if (sourceType !== 'stream') {
          // Streams are always live — don't seek
          const drift = Math.abs(audio.currentTime - compensatedTime);
          if (drift > 2) audio.currentTime = Math.max(0, compensatedTime);
        }
        if (isPlaying) audio.play().catch(e => console.warn('[BroadcastSync] play failed:', e));
      };
    } else {
      // Same source — sync position & play state
      if (sourceType !== 'stream') {
        const drift = Math.abs(audio.currentTime - compensatedTime);
        if (drift > 3) audio.currentTime = Math.max(0, compensatedTime);
      }
      if (isPlaying && audio.paused) {
        audio.play().catch(e => console.warn('[BroadcastSync] play resume failed:', e));
      } else if (!isPlaying && !audio.paused) {
        audio.pause();
      }
    }

    setIsPlaying(isPlaying);
    setCurrentTime(compensatedTime);
  }, [isHost, youtubePlayer, audioRef, setBroadcastTrack, setIsPlaying, setCurrentTime, setDuration, setIsYoutubeMode]);

  // ─── SignalR subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!activeStation || isHost) return;

    const stationId = activeStation.id || activeStation.Id;

    // Ensure connection is live then join
    initSignalR().then(() => joinStation(stationId));

    const unsubscribe = onBroadcastSync((payload) => {
      if (String(payload.stationId) !== String(stationId)) return; // not our station

      estimateLatency(payload);
      currentSyncRef.current = payload;

      // Throttle rapid host scrubs — apply after 150ms quiet window
      clearTimeout(syncThrottleRef.current);
      syncThrottleRef.current = setTimeout(() => {
        applySyncPayload(currentSyncRef.current);
      }, 150);
    });

    console.log('[BroadcastSync] Listening to station:', stationId);

    return () => {
      unsubscribe();
      clearTimeout(syncThrottleRef.current);
      leaveStation(stationId);
      loadedSourceRef.current = null;
      console.log('[BroadcastSync] Unsubscribed from station:', stationId);
    };
  }, [activeStation?.id, activeStation?.Id, isHost, applySyncPayload]);

  // ─── Periodic re-sync (corrects drift every 15s) ─────────────────────────
  useEffect(() => {
    if (!activeStation || isHost) return;

    const interval = setInterval(() => {
      if (currentSyncRef.current) {
        applySyncPayload(currentSyncRef.current);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activeStation?.id, isHost, applySyncPayload]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _keepSilentCarrier(audioRef, isPlaying) {
  const audio = audioRef.current;
  if (!audio) return;
  const SILENT = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
  if (audio.getAttribute('data-playing-src') !== 'silent') {
    audio.src = SILENT;
    audio.loop = true;
    audio.setAttribute('data-playing-src', 'silent');
    audio.load();
  }
  if (isPlaying && audio.paused) {
    audio.play().catch(() => {});
  } else if (!isPlaying && !audio.paused) {
    audio.pause();
  }
}