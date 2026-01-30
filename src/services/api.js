import axios from 'axios';

const BASE_URL = 'http://localhost:5264/api';

const api = axios.create({
    baseURL: BASE_URL,
});

// Interceptor to inject token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const API = {
    Auth: {
        login: (credentials) => api.post('/Auth/login', credentials),
        register: (userData) => api.post('/Auth/register', userData),
        getMe: () => api.get('/auth/me'),
    },
    Albums: {
        getAll: () => api.get('/Albums'),
        getById: (id) => api.get(`/Albums/${id}`),
        create: (data) => api.post('/Albums', data),
    },
    Artists: {
        getAll: () => api.get('/Artists'),
        getById: (id) => api.get(`/Artists/${id}`),
        create: (data) => api.post('/Artists', data),
    },
    Tracks: {
        getAllTracks: () => api.get('/Tracks'),
        getTrackById: (id) => api.get(`/Tracks/${id}`),
        uploadTrack: (formData) => api.post('/Tracks/upload-full', formData),
        deleteTrack: (id) => api.delete(`/Tracks/${id}`),
    },
    Users: {
        getProfile: () => api.get('/users/profile'),
        updateProfile: (formData) => api.post('/users/profile', formData),
        followUser: (id) => api.post(`/User/follow/${id}`),
        unfollowUser: (id) => api.delete(`/User/follow/${id}`),
        getFollowers: (id) => api.get(`/User/${id}/followers`),
        getFollowing: (id) => api.get(`/User/${id}/following`),
    },
    Economy: {
        add: (amount, userId) => api.post('/Economy/add', { userId, amount }),
    },
    Purchases: {
        purchaseTrack: (trackId) => api.post('/purchases', { trackId }),
    },
    Social: {
        likeTrack: (id) => api.post(`/Social/like/${id}`),
        unlikeTrack: (id) => api.delete(`/Social/like/${id}`),
        repostTrack: (id) => api.post(`/Social/repost/${id}`),
        removeRepost: (id) => api.delete(`/Social/repost/${id}`),
        addComment: (trackId, text) => api.post(`/Social/comment`, { trackId, text }),
        getComments: (trackId) => api.get(`/Social/comments/${trackId}`),
    },
    User: {
        followUser: (id) => api.post(`/User/follow/${id}`),
        unfollowUser: (id) => api.delete(`/User/follow/${id}`),
        getFollowers: (id) => api.get(`/User/${id}/followers`),
        getFollowing: (id) => api.get(`/User/${id}/following`),
    },
    Collections: {
        addToPlaylist: (playlistId, trackId) => api.post(`/Collections/playlist/${playlistId}/add`, { trackId }),
        getMyCollection: () => api.get('/Collections/my-collection'),
    },
    Notifications: {
        getNotifications: () => api.get('/Notifications'),
        markRead: (id) => api.put(`/Notifications/${id}/read`),
    }
};

export default API;
