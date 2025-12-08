// Navigation Bar Template
export const navbarTemplate = `
<nav class="navbar">
    <div class="navbar-content">
        <div style="display: flex; align-items: center;">
            <button @click="toggleSidebar" class="hamburger-menu">
                <i class="fas fa-bars"></i>
            </button>
            <div class="navbar-brand">
                <i class="fas fa-cubes"></i>
                Minecraft Server Manager
            </div>
        </div>
        <div class="navbar-actions">
            <!-- Notifications -->
            <div class="notification-container" @click.stop>
                <div class="notification-badge" @click="toggleNotificationPanel">
                    <i class="fas fa-bell"></i>
                    <span v-if="unreadNotificationCount > 0" class="notification-count">
                        {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
                    </span>
                </div>

                <!-- Notification Panel -->
                <div v-if="showNotificationPanel" class="notification-panel">
                    <div class="notification-header">
                        <h3>通知</h3>
                        <div class="notification-actions">
                            <button class="notification-action-btn" @click="markAllNotificationsAsRead" v-if="unreadNotificationCount > 0">
                                すべて既読
                            </button>
                            <button class="notification-action-btn" @click="clearAllNotifications" v-if="notifications.length > 0">
                                すべて削除
                            </button>
                        </div>
                    </div>

                    <div class="notification-list" v-if="notifications.length > 0">
                        <div
                            v-for="notification in notifications"
                            :key="notification.id"
                            :class="['notification-item', { unread: !notification.read }]"
                            @click="markNotificationAsRead(notification.id)"
                        >
                            <div class="notification-item-header">
                                <span class="notification-item-title">{{ notification.title }}</span>
                                <span class="notification-item-time">
                                    {{ new Date(notification.timestamp).toLocaleTimeString() }}
                                </span>
                            </div>
                            <div class="notification-item-message">{{ notification.message }}</div>
                            <div class="notification-item-actions">
                                <button class="notification-item-action" @click.stop="clearNotification(notification.id)">
                                    削除
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="notification-empty" v-else>
                        <i class="fas fa-bell-slash"></i>
                        <p>通知はありません</p>
                    </div>
                </div>
            </div>

            <button @click="toggleTheme" class="theme-toggle" :title="darkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'">
                <i v-if="darkMode" class="fas fa-sun" style="font-size: 14px;"></i>
                <i v-else class="fas fa-moon" style="font-size: 14px;"></i>
            </button>
            <div class="user-menu-container" :class="{ open: userMenuOpen }" @click.stop="toggleUserMenu">
                <div class="user-menu">
                    <div
                        class="user-avatar"
                        :style="frpAuthStatus.linked && frpAuthStatus.discordUser?.avatar ? { backgroundImage: 'url(' + frpAuthStatus.discordUser.avatar + ')' } : {}"
                    >
                        <i v-if="!frpAuthStatus.discordUser?.avatar" class="fas fa-user" style="font-size: 12px;"></i>
                    </div>
                    <span>
                        {{ frpAuthStatus.discordUser?.username || username || '管理者' }}
                    </span>
                    <i class="fas fa-chevron-down" style="font-size: 10px;"></i>
                </div>
                <div class="user-menu-dropdown">
                    <div class="user-menu-item" @click="handleLogout">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>ログアウト</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</nav>
`;
