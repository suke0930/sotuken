export const API_ENDPOINTS = {
    // Base URLs
    BASE_URL: '',  // Relative paths for same-origin requests
    DOWNLOAD_SERVER: 'https://localhost:12800',
    LIST_SERVER: 'https://localhost:12800',
    SIGNUP_SERVER: 'https://127.0.0.1:12800',  // Special case for signup

    // WebSocket
    WS_URL: 'wss://127.0.0.1:12800/ws',

    // User endpoints
    user: {
        auth: '/user/auth',
        signup: '/user/signup',
        login: '/user/login',
        logout: '/user/logout'
    },

    // Server management endpoints
    server: {
        list: '/api/mc/list',
        create: '/api/mc/add',
        update: (id) => `/api/servers/${id}`,
        delete: (id) => `/api/mc/remove/${id}`
    },

    // List endpoints
    list: {
        servers: '/api/assets/list/servers',
        jdk: (type) => `/api/list/${type}`
    },

    // Download endpoints
    download: {
        start: '/api/assets/download',
        cancel: (taskId) => `/api/assets/download/taskid${taskId}`,
        list: (type) => `/api/assets/downloads${type}`
    },

    // Other endpoints
    protected: '/api/protected'
};