// Main Application - Vue App Initialization
import { API_ENDPOINTS } from './Endpoints.js';
import { createStore } from './store.js';
import { createAuthMethods } from './composables/useAuth.js';
import { createServerMethods } from './composables/useServers.js';
import { createDownloadMethods } from './composables/useDownloads.js';
import { createWebSocketMethods } from './composables/useWebSocket.js';
import { createUIMethods } from './composables/useUI.js';
import { appTemplate } from './components/templates.js';

const { createApp } = Vue;

createApp({
    ...createStore(),

    async mounted() {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.darkMode = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            this.darkMode = false;
            document.documentElement.setAttribute('data-theme', 'light');
        }

        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu-container')) {
                this.userMenuOpen = false;
            }
        });

        // Fetch server list data
        await this.fetchServerList();

        await this.checkAuth();
        this.connectWebSocket();
    },

    beforeUnmount() {
        if (this.ws) {
            this.ws.close();
        }
    },

    methods: {
        ...createAuthMethods(),
        ...createServerMethods(),
        ...createDownloadMethods(),
        ...createWebSocketMethods(),
        ...createUIMethods()
    },

    template: appTemplate
}).mount('#app');
