import * as signalR from '@microsoft/signalr';

const HUB_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}hubs/station`
  : 'http://localhost:5000/hubs/station';

let connection = null;
let reconnectTimer = null;

// ─── Listener registry ───────────────────────────────────────────────────────
// Components register handlers here; signalR service fires them.
const listeners = {
  onBroadcastSync:  [], // (payload) => void  — track/play state from host
  onChatMessage:    [], // (msg) => void
  onTrackRequest:   [], // (req) => void
  onListenerCount:  [], // (n) => void
};

export const onBroadcastSync = (fn) => {
  listeners.onBroadcastSync.push(fn);
  return () => { listeners.onBroadcastSync = listeners.onBroadcastSync.filter(f => f !== fn); };
};
export const onChatMessage = (fn) => {
  listeners.onChatMessage.push(fn);
  return () => { listeners.onChatMessage = listeners.onChatMessage.filter(f => f !== fn); };
};
export const onTrackRequest = (fn) => {
  listeners.onTrackRequest.push(fn);
  return () => { listeners.onTrackRequest = listeners.onTrackRequest.filter(f => f !== fn); };
};
export const onListenerCount = (fn) => {
  listeners.onListenerCount.push(fn);
  return () => { listeners.onListenerCount = listeners.onListenerCount.filter(f => f !== fn); };
};

const fire = (key, payload) => listeners[key].forEach(fn => { try { fn(payload); } catch (e) { console.warn(`[SignalR] listener error [${key}]`, e); } });

// ─── Connection ──────────────────────────────────────────────────────────────
export const initSignalR = async () => {
  if (connection && connection.state !== signalR.HubConnectionState.Disconnected) return connection;

  const token = localStorage.getItem('token');

  connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, token ? { accessTokenFactory: () => token } : {})
    .withAutomaticReconnect([0, 1000, 3000, 8000, 15000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  // ── Inbound events ──────────────────────────────────────────────────────────

  // Host → all listeners: full broadcast sync payload
  // Payload shape:
  // {
  //   stationId, trackId, title, artist, source, cover,
  //   youtubeId, streamUrl,
  //   isPlaying, currentTime, timestamp,
  //   sourceType: 'youtube' | 'local' | 'stream' | 'hardware'
  // }
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

// ─── Host: broadcast current playback state to all listeners ─────────────────
// Call this from App.js whenever track/play state changes on the HOST side.
// sourceType: 'youtube' | 'local' | 'stream' | 'hardware'
export const syncTrack = async (stationId, track, currentTime, isPlaying) => {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  if (!stationId || !track) return;

  const source = track.source || track.Source || '';
  const youtubeId = source.startsWith('youtube:') ? source.split(':')[1] : (track.youtubeId || track.YoutubeId || null);

  const sourceType = youtubeId
    ? 'youtube'
    : source.startsWith('http') && !source.includes('localhost')
      ? 'stream'
      : source.startsWith('hardware:')
        ? 'hardware'
        : 'local';

  const payload = {
    stationId: String(stationId),
    trackId:   String(track.id || track.Id || ''),
    title:     track.title || track.Title || '',
    artist:    track.artist || track.artistName || track.ArtistName || '',
    cover:     track.cover || track.coverImageUrl || track.CoverImageUrl || '',
    source:    source,
    youtubeId: youtubeId || null,
    streamUrl: sourceType === 'stream' ? source : null,
    isPlaying: !!isPlaying,
    currentTime: currentTime || 0,
    timestamp: Date.now(),   // listeners use this to compensate for latency
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

export default connection;