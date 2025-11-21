// UI Control Logic
import { formatDate, formatTime } from '../utils/helpers.js';
import { helpContent } from '../utils/helpContent.js';
import { aboutUsContent } from '../content/aboutUs.js';
import { tutorialsContent } from '../content/tutorials.js';

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
            } else if (tabId === 'about') {
                this.renderAboutUs();
            } else if (tabId === 'tutorials') {
                this.renderTutorials();
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

        openHelpModal(topicKey) {
            const topic = helpContent[topicKey];
            if (!topic) {
                console.error(`Help topic not found: ${topicKey}`);
                return;
            }

            this.helpModal.title = topic.title;
            // Use marked.js to parse markdown to HTML
            if (typeof marked !== 'undefined') {
                this.helpModal.content = marked.parse(topic.content);
            } else {
                // Fallback if marked.js is not loaded
                this.helpModal.content = topic.content.replace(/\n/g, '<br>');
            }
            this.helpModal.visible = true;
        },

        closeHelpModal() {
            this.helpModal.visible = false;
            this.helpModal.title = '';
            this.helpModal.content = '';
        },

        renderAboutUs() {
            if (!this.aboutUsRendered && typeof marked !== 'undefined') {
                this.aboutUsRendered = marked.parse(aboutUsContent);
            }
        },

        renderTutorials() {
            if (!this.tutorialsRendered && typeof marked !== 'undefined') {
                this.tutorialsRendered = marked.parse(tutorialsContent);
            }
        },

        formatDate,
        formatTime
    };
}
