import * as signalR from '@microsoft/signalr';

let connection = null;

export const initSignalR = (token) => {
    if (connection) return connection;

    const url = process.env.NODE_ENV === 'production' 
        ? '/hubs/radio'
        : 'http://localhost:5264/hubs/radio';

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
