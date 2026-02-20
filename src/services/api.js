import axios from 'axios';

const BASE_URL = 'http://localhost:5264/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
});

// Interceptor to inject token and UserID
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');

    console.log('[API] Request:', config.method?.toUpperCase(), config.url);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            const uid = user?.id || user?.Id || user?.userId || user?.UserId;
            if (uid) {
                config.headers.UserId = uid;
                console.log('[API_INTERCEPTOR] UserId header set:', uid, 'for', config.url);
            } else {
                console.warn('[API_INTERCEPTOR] No valid user ID found in localStorage user object:', user);
            }
        } catch (e) {
            console.error("[API] Failed to parse user for headers", e);
        }
    } else {
        console.warn('[API] No user found in localStorage');
    }

    console.log('[API] Headers:', config.headers);
    return config;
});

// Response interceptor to log responses and errors
api.interceptors.response.use(
    (response) => {
        console.log('[API] Response:', response.status, response.config.url, response.data);
        return response;
    },
    (error) => {
        console.error('[API] Error:', error.response?.status, error.config?.url);
        console.error('[API] Error details:', error.response?.data);
        return Promise.reject(error);
    }
);

const API = {
    Auth: {
        login: (credentials) => api.post('Auth/login', credentials),
        register: (userData) => api.post('Auth/register', userData),
        getMe: () => api.get('Auth/me'),
    },
    Albums: {
        getAll: () => api.get('Albums'),
        getById: (id) => api.get(`Albums/${id}`),
        create: (data) => api.post('Albums', data),
    },
    Artists: {
        getAll: () => api.get('Artists'),
        getById: (id) => api.get(`Artists/${id}`),
        create: (data) => api.post('Artists', data),
        likeArtist: (id) => api.post(`Artists/like/${id}`),
        checkLike: (id) => api.get(`Artists/like/check/${id}`),
        getByUserId: (userId) => api.get(`Artists/user/${userId}`),
    },
    Tracks: {
        getAllTracks: () => api.get('Tracks'),
        getTrackById: (id) => api.get(`Tracks/${id}`),
        uploadTrack: (formData) => api.post('Tracks/upload-full', formData),
        togglePin: (id) => api.post(`Tracks/${id}/toggle-pin`),
        togglePost: (id) => api.post(`Tracks/${id}/toggle-post`),
        deleteTrack: (id) => api.delete(`Tracks/${id}`),
    },
    Users: {
        getProfile: () => api.get('users/profile'),
        updateProfile: (formData) => api.put('Users/update-profile', formData), // Updated to match controller Put mapping
        followUser: (id) => api.post(`Artists/like/${id}`), // Re-routed to Artists for social linking
        unfollowUser: (id) => api.post(`Artists/like/${id}`), // It's a toggle in backend
        getFollowers: (id) => api.get(`Users/${id}/followers`),
        getFollowing: (id) => api.get(`Users/${id}/following`),
        searchUsers: (query) => api.get(`Users/search?query=${query}`),
        getUserById: (id) => api.get(`Users/${id}`),
    },
    Economy: {
        add: (amount, userId) => api.post('Economy/add', { userId, amount }),
        tipArtist: (artistId, amount = 50) => api.post(`Economy/tip/${artistId}?amount=${amount}`),
        getBundles: () => api.get('CreditPurchase/bundles'),
        purchaseCredits: (bundleId) => api.post('CreditPurchase/purchase', { bundleId, paymentMethodId: 'tok_visa' }),
    },
    Purchases: {
        purchaseTrack: (trackId) => api.post(`Economy/purchase/${trackId}`),
        getMyPurchases: () => api.get('Purchases'),
    },
    Social: {
        likeTrack: (trackId) => api.post(`Social/like/${trackId}`),
        unlikeTrack: (trackId) => api.post(`Social/unlike/${trackId}`),
        repostTrack: (id) => api.post(`Social/repost/${id}`),
        removeRepost: (id) => api.delete(`Social/repost/${id}`),
        addComment: (trackId, text) => api.post(`Social/comment`, { trackId, text }),
        getComments: (trackId) => api.get(`Social/comments/${trackId}`),
    },
    User: {
        followUser: (id) => api.post(`User/follow/${id}`),
        unfollowUser: (id) => api.delete(`User/follow/${id}`),
        getFollowers: (id) => api.get(`User/${id}/followers`),
        getFollowing: (id) => api.get(`User/${id}/following`),
    },
    Collections: {
        addToPlaylist: (playlistId, trackId) => api.post(`Collections/playlist/${playlistId}/add`, { trackId }),
        getMyCollection: () => api.get('Collections/my-collection'),
    },
    Notifications: {
        getNotifications: () => api.get('Notifications'),
        markRead: (id) => api.put(`Notifications/${id}/read`),
    },
    Likes: {
        getMyLikes: () => api.get('Likes'),
        cleanup: () => api.post('Likes/cleanup'),
    },
    Discovery: {
        recordPlay: (id) => api.post(`Discovery/track-play/${id}`),
        getStats: () => api.get('Discovery/stats'),
        getOnlineUsers: () => api.get('Discovery/online-users'),
        heartbeat: () => api.post('Discovery/heartbeat'),
    },
    Youtube: {
        search: (query) => api.get(`Youtube/search?query=${encodeURIComponent(query)}`),
        stream: (videoId, userId) => api.get(`Youtube/stream?videoId=${videoId}&userId=${userId}`),
        saveTrack: (trackData) => api.post('YoutubeTracks/save', trackData),
        getTrack: (videoId) => api.get(`YoutubeTracks/by-youtube-id/${videoId}`),
    },
    Messages: {
        getConversations: () => api.get('Messages/conversations'),
        getConversation: (userId) => api.get(`Messages/conversation/${userId}`),
        sendMessage: (data) => api.post('Messages/send', data),
    },
    Subscriptions: {
        getStatus: () => api.get('Subscriptions/youtube-cache/status'),
        getTiers: () => api.get('Subscriptions/youtube-cache/tiers'),
        subscribe: (tier) => api.post('Subscriptions/youtube-cache/subscribe', { tier, paymentMethodId: 'tok_visa' }), // Mock payment
    },
    YoutubeCache: {
        cacheTrack: (youtubeTrackId) => api.post(`YoutubeCache/${youtubeTrackId}/cache`),
        uncacheTrack: (youtubeTrackId) => api.delete(`YoutubeCache/${youtubeTrackId}`),
        getMyCachedTracks: () => api.get('YoutubeCache/my-cached-tracks'),
        getStats: () => api.get('YoutubeCache/stats'),
    },
    Playlists: {
        getUserPlaylists: (userId) => api.get(`Playlists/user/${userId}`),
        getById: (id) => api.get(`Playlists/${id}`),
        create: (data) => api.post('Playlists', data),
        addTrack: (id, trackId) => api.post(`Playlists/${id}/tracks`, { trackId }),
        removeTrack: (id, trackId) => api.delete(`Playlists/${id}/tracks/${trackId}`),
        update: (id, data) => api.put(`Playlists/${id}`, data),
        delete: (id) => api.delete(`Playlists/${id}`)
    },
    Wallet: {
        getTransactions: (type, limit = 20, offset = 0) => api.get(`Wallet/transactions?type=${type || ''}&limit=${limit}&offset=${offset}`),
        getEarningsSummary: () => api.get('Wallet/earnings/summary'),
        transferCredits: (toUserId, amount) => api.post('Wallet/transfer', { toUserId, amount }),
        requestWithdrawal: (amount, method) => api.post('Wallet/withdraw/request', { amount, method })
    },
    Journal: {
        getMyJournal: () => api.get('Journal'),
        getUserJournal: (userId) => api.get(`Journal/user/${userId}`),
        create: (data) => api.post('Journal', data),
        update: (id, data) => api.put(`Journal/${id}`, data),
        togglePost: (id) => api.post(`Journal/toggle-post/${id}`),
        togglePin: (id) => api.post(`Journal/toggle-pin/${id}`),
        delete: (id) => api.delete(`Journal/${id}`)
    },
    Studio: {
        getMyGallery: () => api.get('Studio'),
        getUserGallery: (userId) => api.get(`Studio/user/${userId}`),
        upload: (formData) => api.post('Studio/upload', formData),
        delete: (id) => api.delete(`Studio/${id}`),
        togglePin: (id) => api.post(`Studio/toggle-pin/${id}`),
        togglePost: (id) => api.post(`Studio/toggle-post/${id}`),
    }
};

export default API;
