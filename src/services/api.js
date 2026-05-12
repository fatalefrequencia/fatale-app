import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5264/api/';
console.log('[API_SERVICE] Initializing with URL:', BASE_URL);

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
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
            // Robust extraction: check multiple variants and ensure it's a valid ID
            const rawId = user?.id ?? user?.Id ?? user?.userId ?? user?.UserId;
            const uid = parseInt(rawId, 10);

            if (!isNaN(uid) && uid > 0) {
                config.headers['UserId'] = String(uid);
                // console.log('[API_INTERCEPTOR] UserId header established:', uid);
            } else {
                // If we have a user object but no valid ID, it's a corrupt session
                console.warn('[API_INTERCEPTOR] Session corruption detected. Invalid ID:', rawId);
            }
        } catch (e) {
            console.error("[API] Failed to parse user for headers", e);
        }
    }

    console.log('[API] Headers:', config.headers);
    return config;
});

// Response interceptor to log responses and errors
api.interceptors.response.use(
    (response) => {
        console.log('[API] Response:', response.status, response.config.baseURL + response.config.url, response.data);
        return response;
    },
    (error) => {
        console.error('[API] Error:', error.response?.status, error.config?.url);
        if (error.config) {
            console.error('[API] Full URL:', error.config.baseURL + error.config.url);
        }
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
        uploadAlbum: (formData) => api.post('Albums/upload-full', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000 // 2 min for multi-track uploads
        }),
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
        getAllTracks: (params) => api.get('Tracks', { params }),
        getTrackById: (id) => api.get(`Tracks/${id}`),
        uploadTrack: (formData) => api.post('Tracks/upload-full', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
        }),
        togglePin: (id) => api.post(`Tracks/${id}/toggle-pin`),
        togglePost: (id) => api.post(`Tracks/${id}/toggle-post`),
        deleteTrack: (id) => api.delete(`Tracks/${id}`),
    },
    Users: {
        getProfile: (userId = null) => api.get(`Users/profile?_t=${new Date().getTime()}`, {
            headers: userId ? { 'UserId': userId } : {}
        }),
        updateProfile: (data, userId) => api.put('Users/update-profile', data, {
            headers: { UserId: userId },
            timeout: 120000 // 2 min for media updates
        }),
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

        // Unified Feed Actions
        toggleLike: (itemType, itemId) => api.post('SocialAction/like', { itemType, itemId }),
        toggleRepost: (itemType, itemId) => api.post('SocialAction/repost', { itemType, itemId }),
        addFeedComment: (itemType, itemId, content, parentId = null) => api.post('SocialAction/comment', { itemType, itemId, content, parentId }),
        getFeedComments: (itemType, itemId) => api.get(`SocialAction/comments/${itemType}/${itemId}`),
        deleteFeedComment: (commentId) => api.delete(`SocialAction/comment/${commentId}`),
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
        getRecentTracks: () => api.get('YoutubeTracks/recent'),
        getDiscoveryNodes: (query) => api.get(`Youtube/discovery-nodes?query=${encodeURIComponent(query || '')}`),
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
    YoutubeTracks: {
        save: (data) => api.post('YoutubeTracks/save', data),
        getByYoutubeId: (youtubeId) => api.get(`YoutubeTracks/by-youtube-id/${youtubeId}`),
    },
    Playlists: {
        getAll: () => api.get('Playlists'),
        getUserPlaylists: (userId) => api.get(`Playlists/user/${userId}`),
        getById: (id) => api.get(`Playlists/${id}`),
        create: (data) => api.post('Playlists', data),
        addTrack: (id, trackId) => api.post(`Playlists/${id}/tracks`, { trackId, TrackId: trackId }),
        removeTrack: (id, trackId) => api.delete(`Playlists/${id}/tracks/${trackId}`),
        update: (id, data) => api.put(`Playlists/${id}`, data),
        delete: (id) => api.delete(`Playlists/${id}`),
        togglePin: (id) => api.post(`Playlists/${id}/toggle-pin`),
        togglePost: (id) => api.post(`Playlists/${id}/toggle-post`),
        uploadCover: (id, formData) => api.post(`Playlists/${id}/upload-cover`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000
        })
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
        getAllPosted: () => api.get('Studio/all'),
        upload: (formData) => api.post('Studio/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
        }),
        delete: (id) => api.delete(`Studio/${id}`),
        togglePin: (id) => api.post(`Studio/toggle-pin/${id}`),
        togglePost: (id) => api.post(`Studio/toggle-post/${id}`),
        updateThumbnail: (id, formData) => api.post(`Studio/update-thumbnail/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
    },
    Feed: {
        getGlobalFeed: () => api.get('Feed'),
    },
    Stations: {
        getAll: () => api.get('Stations'),
        getFavorites: () => api.get('Stations/favorites'),
        toggleFavorite: (id) => api.post(`Stations/favorite/${id}`),
        getByUserId: (userId) => api.get(`Stations/user/${userId}`),
        goLive: (data) => api.post('Stations/go-live', data),
        endLive: () => api.post('Stations/end-live'),
    },
    Communities: {
        getAll: () => api.get(`Communities?_t=${new Date().getTime()}`),
        create: (data) => api.post('Communities', data),
        join: (id) => api.post(`Communities/${id}/join`),
        leave: () => api.post('Communities/leave'),
        getMembers: (id) => api.get(`Communities/${id}/members`),
        follow: (id) => {
            const followed = JSON.parse(localStorage.getItem('followed_communities') || '[]');
            if (!followed.includes(id)) {
                followed.push(id);
                localStorage.setItem('followed_communities', JSON.stringify(followed));
            }
            // Dispatch custom event for immediate UI sync across components
            window.dispatchEvent(new CustomEvent('communityFollowChanged', { detail: { id, followed: true } }));
            return Promise.resolve({ data: { success: true } });
        },
        unfollow: (id) => {
            let followed = JSON.parse(localStorage.getItem('followed_communities') || '[]');
            followed = followed.filter(cid => cid !== id);
            localStorage.setItem('followed_communities', JSON.stringify(followed));
            // Dispatch custom event for immediate UI sync
            window.dispatchEvent(new CustomEvent('communityFollowChanged', { detail: { id, followed: false } }));
            return Promise.resolve({ data: { success: true } });
        },
        getFollowed: () => JSON.parse(localStorage.getItem('followed_communities') || '[]'),
        delete: (id) => api.delete(`Communities/${id}`),
        updateImageUrl: (id, imageUrl) => api.post(`Communities/${id}/image`, { imageUrl })
    },
    Files: {
        upload: (formData) => api.post('File/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
        })
    },
    Organic: {
        logEvent: (eventData) => api.post('listening-events', eventData),
        updateEventDuration: (eventId, durationSeconds) => api.put(`listening-events/${eventId}/duration`, { durationSeconds }),
        getNextRecommendation: (lastVideoId, lastTrackType = 'youtube', count = 3) =>
            api.get(`recommendations/next?lastVideoId=${lastVideoId}&lastTrackType=${lastTrackType}&count=${count}`)
    },
    Pulse: {
        getNeuroGraph: () => api.get('pulse/neuro-graph'),
        getResonantStations: (topTag) => api.get(`pulse/resonant-stations?topTag=${encodeURIComponent(topTag)}`)
    },
    CommunityChat: {
        getMessages: (communityId, afterId = null) =>
            api.get(`community-chat/${communityId}${afterId != null ? `?afterId=${afterId}` : ''}`),
        sendMessage: (communityId, content) =>
            api.post(`community-chat/${communityId}`, { content })
    },
    Gear: {
        getByUser: (userId) => api.get(`Gear/user/${userId}`),
        add: (data) => api.post('Gear', data),
        update: (id, data) => api.put(`Gear/${id}`, data),
        remove: (id) => api.delete(`Gear/${id}`),
    }
};

export default API;
