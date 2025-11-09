// UI Control Logic
import { formatDate, formatTime } from '../utils/helpers.js';

export function createUIMethods() {
    return {
        toggleTheme() {
            this.darkMode = !this.darkMode;
            if (this.darkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        },

        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },

        closeSidebar() {
            this.sidebarOpen = false;
        },

        toggleUserMenu() {
            this.userMenuOpen = !this.userMenuOpen;
        },

        closeUserMenu() {
            this.userMenuOpen = false;
        },

        switchTab(tabId) {
            if (tabId === 'create' && this.activeTab === 'create' && this.editingServer) {
                this.resetForm();
            }
            this.activeTab = tabId;

            if (tabId === 'create' && !this.editingServer) {
                this.prepareCreateTab();
            } else if (tabId === 'jdk-management') {
                this.loadInstalledJdks();
            }
            // Close sidebar on mobile after selection
            if (window.innerWidth < 1024) {
                this.closeSidebar();
            }
        },

        async testProtectedApi() {
            try {
                const response = await fetch(API_ENDPOINTS.protected, {
                    credentials: 'include'
                });
                const data = await response.json();
                this.apiResponse = JSON.stringify(data, null, 2);
            } catch (error) {
                this.apiResponse = `Error: ${error.message}`;
            }
        },

        showError(message) {
            this.errorMessage = message;
            setTimeout(() => {
                this.errorMessage = '';
            }, 5000);
        },

        showSuccess(message) {
            this.successMessage = message;
            setTimeout(() => {
                this.successMessage = '';
            }, 5000);
        },

        formatDate,
        formatTime
    };
}
