import * as signalR from '@microsoft/signalr';

const HUB_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}hubs/station`
  : 'http://localhost:5000/hubs/station';

let connection = null;
let reconnectTimer = null;

// ─── Listener registry ───────────────────────────────────────────────────────
const listeners = {
  onBroadcastSync:    [], // (payload) => void  — track/play state from host
  onChatMessage:      [], // (msg) => void
  onTrackRequest:     [], // (req) => void
  onListenerCount:    [], // (n) => void
  // WebRTC signaling
  onListenerJoined:   [], // ({ listenerConnectionId, stationId }) => void  — host receives
  onStreamRequested:  [], // ({ listenerConnectionId, stationId }) => void  — host receives
  onStreamOffer:      [], // ({ sdpOffer, hostConnectionId, stationId }) => void  — listener receives
  onStreamAnswer:     [], // ({ sdpAnswer, listenerConnectionId, stationId }) => void  — host receives
  onIceCandidate:     [], // ({ candidateJson, fromConnectionId, stationId }) => void
  onHostDisconnected: [], // ({ stationId }) => void — listeners receive
};

const reg = (key) => (fn) => {
  listeners[key].push(fn);
  return () => { listeners[key] = listeners[key].filter(f => f !== fn); };
};

export const onBroadcastSync    = reg('onBroadcastSync');
export const onChatMessage      = reg('onChatMessage');
export const onTrackRequest     = reg('onTrackRequest');
export const onListenerCount    = reg('onListenerCount');
export const onListenerJoined   = reg('onListenerJoined');
export const onStreamRequested  = reg('onStreamRequested');
export const onStreamOffer      = reg('onStreamOffer');
export const onStreamAnswer     = reg('onStreamAnswer');
export const onIceCandidate     = reg('onIceCandidate');
export const onHostDisconnected = reg('onHostDisconnected');

const fire = (key, payload) =>
  listeners[key].forEach(fn => { try { fn(payload); } catch (e) { console.warn(`[SignalR] listener error [${key}]`, e); } });

// ─── Connection ──────────────────────────────────────────────────────────────
export const initSignalR = async () => {
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) return connection;

  const token = localStorage.getItem('token');

  connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, token ? { accessTokenFactory: () => token } : {})
    .withAutomaticReconnect([0, 1000, 3000, 8000, 15000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  // ── Inbound: metadata sync ──────────────────────────────────────────────────
  connection.on('BroadcastSync', (payload) => {
    console.log('[SignalR] BroadcastSync received:', payload);
    fire('onBroadcastSync', payload);
  });

  connection.on('ReceiveMessage', (username, message, timestamp) => {
    fire('onChatMessage', { username, message, timestamp });
  });

  connection.on('TrackRequested', (trackTitle, trackId, username) => {
    fire('onTrackRequest', { trackTitle, trackId, username });
  });

  connection.on('ListenerCount', (count) => {
    fire('onListenerCount', count);
  });

  // ── Inbound: WebRTC signaling ───────────────────────────────────────────────
  // Host receives: a new listener joined mid-broadcast
  connection.on('ListenerJoined', (payload) => {
    console.log('[SignalR][WebRTC] ListenerJoined:', payload);
    fire('onListenerJoined', payload);
  });

  // Host receives: listener explicitly requested a stream
  connection.on('StreamRequested', (payload) => {
    console.log('[SignalR][WebRTC] StreamRequested:', payload);
    fire('onStreamRequested', payload);
  });

  // Listener receives: SDP offer from host
  connection.on('StreamOffer', (payload) => {
    console.log('[SignalR][WebRTC] StreamOffer received');
    fire('onStreamOffer', payload);
  });

  // Host receives: SDP answer from listener
  connection.on('StreamAnswer', (payload) => {
    console.log('[SignalR][WebRTC] StreamAnswer received');
    fire('onStreamAnswer', payload);
  });

  // Both sides receive: ICE candidate from the other side
  connection.on('IceCandidate', (payload) => {
    fire('onIceCandidate', payload);
  });

  // Listeners receive: host disconnected
  connection.on('HostDisconnected', (payload) => {
    console.log('[SignalR][WebRTC] HostDisconnected:', payload);
    fire('onHostDisconnected', payload);
  });

  connection.onreconnected(() => {
    console.log('[SignalR] Reconnected');
  });

  connection.onclose(() => {
    console.log('[SignalR] Connection closed — scheduling reconnect...');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => initSignalR(), 5000);
  });

  try {
    await connection.start();
    console.log('[SignalR] Connected:', connection.connectionId);
  } catch (e) {
    console.error('[SignalR] Failed to connect:', e);
    reconnectTimer = setTimeout(() => initSignalR(), 5000);
  }

  return connection;
};

// Expose the raw connection so WebRTC hooks can read connectionId
export const getConnection = () => connection;

// ─── Station actions ─────────────────────────────────────────────────────────
export const joinStation = async (stationId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
    await initSignalR();
  }
  try {
    await connection.invoke('JoinStation', String(stationId));
    console.log('[SignalR] Joined station:', stationId);
  } catch (e) {
    console.error('[SignalR] JoinStation failed:', e);
  }
};

export const leaveStation = async (stationId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('LeaveStation', String(stationId));
    console.log('[SignalR] Left station:', stationId);
  } catch (e) {
    console.error('[SignalR] LeaveStation failed:', e);
  }
};

export const registerHost = async (stationId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('RegisterHost', String(stationId));
    console.log('[SignalR] Registered as host for station:', stationId);
  } catch (e) {
    console.error('[SignalR] RegisterHost failed:', e);
  }
};

export const unregisterHost = async (stationId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('UnregisterHost', String(stationId));
  } catch (e) {
    console.error('[SignalR] UnregisterHost failed:', e);
  }
};

// ─── Host: broadcast current playback state ───────────────────────────────────
export const syncTrack = async (stationId, track, currentTime, isPlaying) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  if (!stationId || !track) return;

  const source = track.source || track.Source || '';
  const youtubeId = source.startsWith('youtube:') ? source.split(':')[1] : (track.youtubeId || track.YoutubeId || null);

  const sourceType = track.sourceType ||
    (youtubeId
      ? 'youtube'
      : source.startsWith('http') && !source.includes('localhost')
        ? 'stream'
        : source.startsWith('hardware:')
          ? 'hardware'
          : 'local');

  const payload = {
    stationId:   String(stationId),
    trackId:     String(track.id || track.Id || ''),
    title:       track.title || track.Title || '',
    artist:      track.artist || track.artistName || track.ArtistName || '',
    cover:       track.cover || track.coverImageUrl || track.CoverImageUrl || '',
    source,
    youtubeId:   youtubeId || null,
    streamUrl:   sourceType === 'stream' ? source : null,
    isPlaying:   !!isPlaying,
    currentTime: currentTime || 0,
    timestamp:   Date.now(),
    sourceType,
  };

  try {
    await connection.invoke('BroadcastSync', payload);
  } catch (e) {
    console.warn('[SignalR] syncTrack failed:', e);
  }
};

// ─── Chat / Queue ─────────────────────────────────────────────────────────────
export const sendMessage = async (stationId, message, username) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('SendMessage', String(stationId), message, username);
  } catch (e) {
    console.error('[SignalR] SendMessage failed:', e);
  }
};

export const requestTrack = async (stationId, trackData, username) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('RequestTrack', String(stationId), trackData?.title || '', String(trackData?.id || ''), username);
  } catch (e) {
    console.error('[SignalR] RequestTrack failed:', e);
  }
};

// ─── WebRTC Signaling ─────────────────────────────────────────────────────────

/** Listener → hub: ask host to initiate a WebRTC connection */
export const requestStream = async (stationId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('RequestStream', String(stationId));
    console.log('[SignalR][WebRTC] Requested stream for station:', stationId);
  } catch (e) {
    console.error('[SignalR] RequestStream failed:', e);
  }
};

/** Host → listener: send SDP offer */
export const sendOffer = async (listenerConnectionId, sdpOffer, stationId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('OfferStream', listenerConnectionId, sdpOffer, String(stationId));
  } catch (e) {
    console.error('[SignalR] OfferStream failed:', e);
  }
};

/** Listener → host: send SDP answer */
export const sendAnswer = async (hostConnectionId, sdpAnswer, stationId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('AnswerStream', hostConnectionId, sdpAnswer, String(stationId));
  } catch (e) {
    console.error('[SignalR] AnswerStream failed:', e);
  }
};

/** Send an ICE candidate to the other peer */
export const sendIceCandidate = async (targetConnectionId, candidate, stationId) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('IceCandidate', targetConnectionId, JSON.stringify(candidate), String(stationId));
  } catch (e) {
    console.error('[SignalR] IceCandidate failed:', e);
  }
};

export default connection;