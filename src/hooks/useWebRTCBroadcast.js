/**
 * useWebRTCBroadcast — Host-side hook
 *
 * When the DJ is live with a hardware source (microphone, turntable, etc.),
 * this hook manages a pool of RTCPeerConnections — one per listener.
 *
 * Flow:
 *  1. Host calls `goLive()` with their MediaStream → hook calls registerHost()
 *  2. When a listener joins or requests a stream, hub fires onListenerJoined / onStreamRequested
 *  3. Hook creates an RTCPeerConnection for that listener, adds the audio track, sends SDP offer
 *  4. On SDP answer → completes the handshake
 *  5. ICE candidates are exchanged bidirectionally
 *  6. P2P audio channel established — listener hears the host directly
 *
 * ICE Configuration (STUN + TURN):
 *  - Primary STUN: Google's free public servers
 *  - TURN: Metered.ca free tier credentials (configurable via env vars)
 *    VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL
 *    Free tier: 500MB/month relay — enough for testing/small events.
 *    For large audiences, upgrade at metered.ca or self-host coturn.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  registerHost,
  unregisterHost,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
  onListenerJoined,
  onStreamRequested,
  onStreamAnswer,
  onIceCandidate as onIceCandidateEvent,
} from '../services/signalr';

// ICE server config — STUN (free) + TURN (free tier via env vars)
const buildIceServers = () => {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  // TURN relay — plug in credentials from your provider
  // Metered.ca free tier: create account at app.metered.ca/auth/signup
  const turnUrl        = import.meta.env.VITE_TURN_URL;
  const turnUsername   = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push(
      { urls: `turn:${turnUrl}`,      username: turnUsername, credential: turnCredential },
      { urls: `turns:${turnUrl}:443`, username: turnUsername, credential: turnCredential },
    );
    console.log('[WebRTC] TURN server configured:', turnUrl);
  } else {
    console.log('[WebRTC] No TURN credentials found — STUN only. Set VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL for relay support.');
  }

  return servers;
};

const ICE_SERVERS = buildIceServers();

/**
 * @param {Object}         options
 * @param {string|null}    options.stationId        — active station ID (null if not live)
 * @param {MediaStream|null} options.micStream      — live hardware audio stream from DJMixerPlayer
 * @param {boolean}        options.isHost           — only run if this user is the host
 * @param {boolean}        options.isBroadcasting   — true after Go Live is confirmed
 */
export function useWebRTCBroadcast({ stationId, micStream, isHost, isBroadcasting, isPlaying, broadcastSourceType }) {
  // Map: listenerConnectionId → RTCPeerConnection
  const peers = useRef(new Map());
  const isRegistered = useRef(false);

  // Enable/disable tracks based on isPlaying state to support muting/pausing hardware stream
  useEffect(() => {
    if (micStream && broadcastSourceType === 'hardware') {
      micStream.getAudioTracks().forEach(track => {
        track.enabled = !!isPlaying;
      });
    }
  }, [micStream, isPlaying, broadcastSourceType]);

  // ── Create a new peer connection for a listener ──────────────────────────
  const createPeerForListener = useCallback(async (listenerConnectionId) => {
    if (!micStream || !stationId) return;
    if (peers.current.has(listenerConnectionId)) return; // already have a connection

    console.log(`[WebRTC] Creating peer for listener: ${listenerConnectionId}`);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peers.current.set(listenerConnectionId, pc);

    // Add all audio tracks from the mic/hardware stream
    micStream.getAudioTracks().forEach(track => {
      pc.addTrack(track, micStream);
    });

    // Relay our ICE candidates to this listener
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        sendIceCandidate(listenerConnectionId, candidate, stationId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${listenerConnectionId} state: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        pc.close();
        peers.current.delete(listenerConnectionId);
      }
    };

    // Create and send SDP offer
    const offer = await pc.createOffer({ offerToReceiveAudio: false });
    await pc.setLocalDescription(offer);
    await sendOffer(listenerConnectionId, offer.sdp, stationId);

    console.log(`[WebRTC] Offer sent to listener: ${listenerConnectionId}`);
  }, [micStream, stationId]);

  // ── Register as host & subscribe to events ───────────────────────────────
  useEffect(() => {
    if (!isHost || !isBroadcasting || !stationId) return;

    if (!isRegistered.current) {
      registerHost(stationId);
      isRegistered.current = true;
      console.log('[WebRTC] Registered as broadcaster for station:', stationId);
    }

    // A new listener joined mid-broadcast — send them an offer
    const unsubJoined = onListenerJoined(({ listenerConnectionId }) => {
      createPeerForListener(listenerConnectionId);
    });

    // A listener explicitly requested a stream (e.g. page refresh)
    const unsubRequested = onStreamRequested(({ listenerConnectionId }) => {
      createPeerForListener(listenerConnectionId);
    });

    // Listener sent back an SDP answer
    const unsubAnswer = onStreamAnswer(({ sdpAnswer, listenerConnectionId }) => {
      const pc = peers.current.get(listenerConnectionId);
      if (pc && pc.signalingState === 'have-local-offer') {
        pc.setRemoteDescription({ type: 'answer', sdp: sdpAnswer })
          .catch(e => console.error('[WebRTC] setRemoteDescription (answer) failed:', e));
      }
    });

    // Incoming ICE candidate from a listener
    const unsubIce = onIceCandidateEvent(({ candidateJson, fromConnectionId }) => {
      const pc = peers.current.get(fromConnectionId);
      if (pc) {
        try {
          pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidateJson)))
            .catch(e => console.warn('[WebRTC] addIceCandidate failed:', e));
        } catch (e) {
          console.warn('[WebRTC] Invalid ICE candidate JSON:', e);
        }
      }
    });

    return () => {
      unsubJoined();
      unsubRequested();
      unsubAnswer();
      unsubIce();
    };
  }, [isHost, isBroadcasting, stationId, createPeerForListener]);

  // ── When mic stream changes, update all existing peer connections ─────────
  useEffect(() => {
    if (!micStream) return;
    peers.current.forEach((pc) => {
      const senders = pc.getSenders();
      const audioTrack = micStream.getAudioTracks()[0];
      if (!audioTrack) return;
      const audioSender = senders.find(s => s.track?.kind === 'audio');
      if (audioSender) {
        audioSender.replaceTrack(audioTrack).catch(e => console.warn('[WebRTC] replaceTrack failed:', e));
      }
    });
  }, [micStream]);

  // ── Cleanup: close all peers when station ends ────────────────────────────
  useEffect(() => {
    if (!isBroadcasting && isRegistered.current) {
      console.log('[WebRTC] Broadcast ended — closing all peer connections');
      peers.current.forEach(pc => pc.close());
      peers.current.clear();
      if (stationId) unregisterHost(stationId);
      isRegistered.current = false;
    }
  }, [isBroadcasting, stationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peers.current.forEach(pc => pc.close());
      peers.current.clear();
      if (stationId && isRegistered.current) unregisterHost(stationId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
