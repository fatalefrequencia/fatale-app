import * as signalR from '@microsoft/signalr';

let connection = null;

export const initSignalR = (token) => {
    if (connection) return connection;

    let baseUrl = import.meta.env.VITE_SIGNALR_URL;
    if (!baseUrl && import.meta.env.PROD) {
        baseUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api/', '') : 'https://fatale-core.up.railway.app';
    } else if (!baseUrl) {
        baseUrl = 'http://localhost:5264';
    }
    const url = `${baseUrl}/hubs/radio`;

    connection = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => token })
        .withAutomaticReconnect()
        .build();

    connection.start().catch(err => console.error("SignalR Connection Error: ", err));
    return connection;
};

export const joinStation = async (stationId) => {
    if (!connection) return;
    try {
        await connection.invoke("JoinStation", stationId);
    } catch (e) {
        console.error("JoinStation error", e);
    }
};

export const leaveStation = async (stationId) => {
    if (!connection) return;
    try {
        await connection.invoke("LeaveStation", stationId);
    } catch (e) {
        console.error("LeaveStation error", e);
    }
};

export const syncTrack = async (stationId, trackData, currentTime, isPlaying) => {
    if (!connection) return;
    try {
        await connection.invoke("SyncTrack", stationId, trackData, currentTime, isPlaying);
    } catch (e) {
        console.error("SyncTrack error", e);
    }
};

export const sendMessage = async (stationId, message, username) => {
    if (!connection) return;
    try {
        await connection.invoke("SendMessage", stationId, message, username);
    } catch (e) {
        console.error("SendMessage error", e);
    }
};

export const requestTrack = async (stationId, trackData, username) => {
    if (!connection) return;
    try {
        await connection.invoke("RequestTrack", stationId, trackData, username);
    } catch (e) {
        console.error("RequestTrack error", e);
    }
};

export const getConnection = () => connection;
