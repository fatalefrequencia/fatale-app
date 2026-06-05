/**
 * useWebRTCListener — Listener-side hook
 *
 * When a user tunes into a station that has a live hardware broadcast,
 * this hook receives the WebRTC audio stream from the host and pipes it
 * to an <audio> element for playback.
 *
 * Flow:
 *  1. useBroadcastSync detects sourceType === 'hardware' → calls requestStream()
 *  2. Host sends SDP offer → this hook answers
 *  3. ICE candidates exchanged → P2P audio connection established
 *  4. `isReceivingLiveAudio` becomes true → UI shows LIVE AUDIO badge
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  requestStream,
  sendAnswer,
  sendIceCandidate,
  onStreamOffer,
  onIceCandidate as onIceCandidateEvent,
  onHostDisconnected,
  getConnection,
} from '../services/signalr';

const buildIceServers = () => {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  const turnUrl        = import.meta.env.VITE_TURN_URL;
  const turnUsername   = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push(
      { urls: `turn:${turnUrl}`,      username: turnUsername, credential: turnCredential },
      { urls: `turns:${turnUrl}:443`, username: turnUsername, credential: turnCredential },
    );
  }

  return servers;
};

const ICE_SERVERS = buildIceServers();

/**
 * @param {Object}       options
 * @param {Object|null}  options.activeStation      — the station object the user is tuned into
 * @param {boolean}      options.isHost             — skip if user is the host (they're broadcasting, not listening)
 * @param {string|null}  options.broadcastSourceType — 'hardware' | 'app' | null
 * @returns {{ isReceivingLiveAudio: boolean }}
 */
export function useWebRTCListener({ activeStation, isHost, broadcastSourceType, mainAudioRef }) {
  const [isReceivingLiveAudio, setIsReceivingLiveAudio] = useState(false);
  const pcRef = useRef(null);
  const audioRef = useRef(null); // local fallback <audio> element
  const hostConnIdRef = useRef(null);
  const stationIdRef = useRef(null);

  // ── Ensure we have a hidden fallback audio element ───────────────────────
  useEffect(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.autoplay = true;
      el.volume = 1;
      audioRef.current = el;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, []);

  // ── Close & reset peer connection ───────────────────────────────────────
  const closePeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    const targetAudio = (mainAudioRef && mainAudioRef.current) ? mainAudioRef.current : audioRef.current;
    if (targetAudio) {
      targetAudio.srcObject = null;
    }
    setIsReceivingLiveAudio(false);
    hostConnIdRef.current = null;
  }, [mainAudioRef]);

  // ── Handle incoming SDP offer from host ─────────────────────────────────
  const handleOffer = useCallback(async ({ sdpOffer, hostConnectionId, stationId }) => {
    const myStationId = stationIdRef.current;
    if (String(stationId) !== String(myStationId)) return;

    console.log('[WebRTC] Received SDP offer from host:', hostConnectionId);
    hostConnIdRef.current = hostConnectionId;

    // Close any existing connection first
    if (pcRef.current) pcRef.current.close();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Relay our ICE candidates to the host
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && hostConnIdRef.current) {
        sendIceCandidate(hostConnIdRef.current, candidate, myStationId);
      }
    };

    // When we get the remote audio track — pipe to the audio element
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote audio track!');
      if (event.streams && event.streams[0]) {
        const targetAudio = (mainAudioRef && mainAudioRef.current) ? mainAudioRef.current : audioRef.current;
        if (targetAudio) {
          targetAudio.srcObject = event.streams[0];
          targetAudio.play().catch(e => console.warn('[WebRTC] Audio play failed:', e));
        }
        setIsReceivingLiveAudio(true);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Listener connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsReceivingLiveAudio(true);
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
        setIsReceivingLiveAudio(false);
      }
    };

    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: sdpOffer });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendAnswer(hostConnectionId, answer.sdp, myStationId);
      console.log('[WebRTC] SDP answer sent to host');
    } catch (e) {
      console.error('[WebRTC] Offer/answer handshake failed:', e);
      closePeer();
    }
  }, [closePeer]);

  // ── Main effect: subscribe to signals when tuned into a hardware station ─
  useEffect(() => {
    // Only run if we're a listener (not the host) and tuned in
    if (!activeStation || isHost) {
      closePeer();
      return;
    }

    const stationId = String(activeStation.id || activeStation.Id || '');
    stationIdRef.current = stationId;

    // If the broadcast is from a hardware source, request the audio stream
    if (broadcastSourceType === 'hardware') {
      console.log('[WebRTC] Requesting live audio stream for station:', stationId);
      requestStream(stationId);
    }

    const unsubOffer = onStreamOffer(handleOffer);

    const unsubIce = onIceCandidateEvent(({ candidateJson, fromConnectionId }) => {
      // Only process if this is from our host
      if (fromConnectionId !== hostConnIdRef.current) return;
      if (pcRef.current) {
        try {
          pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(candidateJson)))
            .catch(e => console.warn('[WebRTC] addIceCandidate (listener) failed:', e));
        } catch (e) {
          console.warn('[WebRTC] Invalid ICE candidate JSON:', e);
        }
      }
    });

    const unsubHostDisconnect = onHostDisconnected(({ stationId: disconnectedId }) => {
      if (String(disconnectedId) === stationId) {
        console.log('[WebRTC] Host disconnected — closing live audio');
        closePeer();
      }
    });

    return () => {
      unsubOffer();
      unsubIce();
      unsubHostDisconnect();
      closePeer();
    };
  }, [activeStation?.id, isHost, broadcastSourceType, handleOffer, closePeer]);

  return { isReceivingLiveAudio };
}
