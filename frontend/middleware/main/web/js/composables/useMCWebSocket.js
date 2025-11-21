// Minecraft Server WebSocket Management
import { API_ENDPOINTS } from '../Endpoints.js';

export function createMCWebSocketMethods() {
    return {
        connectMCWebSocket() {
            if (this.mcWebSocket) {
                this.mcWebSocket.close();
            }

            const wsUrl = 'wss://127.0.0.1:12800/ws/mcserver';
            this.mcWebSocket = new WebSocket(wsUrl);

            this.mcWebSocket.onopen = () => {
                console.log('MC WebSocket connected');
                this.mcWebSocketConnected = true;

                // Re-subscribe to all servers
                this.subscribedServers.forEach(uuid => {
                    this.subscribeToServer(uuid);
                });
            };

            this.mcWebSocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMCWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse MC WebSocket message:', error);
                }
            };

            this.mcWebSocket.onerror = (error) => {
                console.error('MC WebSocket error:', error);
                this.mcWebSocketConnected = false;
            };

            this.mcWebSocket.onclose = () => {
                console.log('MC WebSocket disconnected');
                this.mcWebSocketConnected = false;

                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    if (!this.mcWebSocketConnected) {
                        this.connectMCWebSocket();
                    }
                }, 3000);
            };
        },

        subscribeToServer(serverUuid) {
            if (!this.mcWebSocketConnected || !this.mcWebSocket) {
                console.warn('Cannot subscribe: MC WebSocket not connected');
                return;
            }

            this.subscribedServers.add(serverUuid);

            this.mcWebSocket.send(JSON.stringify({
                type: 'subscribe',
                data: { uuid: serverUuid },
                timestamp: new Date().toISOString()
            }));
        },

        unsubscribeFromServer(serverUuid) {
            if (!this.mcWebSocketConnected || !this.mcWebSocket) {
                return;
            }

            this.subscribedServers.delete(serverUuid);

            this.mcWebSocket.send(JSON.stringify({
                type: 'unsubscribe',
                data: { uuid: serverUuid },
                timestamp: new Date().toISOString()
            }));
        },

        handleMCWebSocketMessage(message) {
            const { type, data, timestamp } = message;

            switch (type) {
                case 'server_stdout':
                    this.handleServerStdout(data);
                    break;
                case 'server_stderr':
                    this.handleServerStderr(data);
                    break;
                case 'server_started':
                    this.handleServerStarted(data);
                    break;
                case 'server_stopped':
                    this.handleServerStopped(data);
                    break;
                case 'server_crashed':
                    this.handleServerCrashed(data);
                    break;
                case 'server_auto_restarted':
                    this.handleServerAutoRestarted(data);
                    break;
                case 'server_auto_restart_limit_reached':
                    this.handleServerAutoRestartLimitReached(data);
                    break;
                case 'server_stop_timeout':
                    this.handleServerStopTimeout(data);
                    break;
                case 'server_forced_kill':
                    this.handleServerForcedKill(data);
                    break;
                case 'subscribe':
                case 'unsubscribe':
                    // Confirmation messages - can be logged if needed
                    console.log(`${type} confirmation for ${data.uuid}`);
                    break;
                case 'pong':
                    // Heartbeat response
                    break;
                default:
                    console.warn('Unknown MC WebSocket message type:', type);
            }
        },

        handleServerStdout(data) {
            const { uuid, line } = data;

            // Add to console if console is open for this server
            if (this.consoleModal.visible && this.consoleModal.serverUuid === uuid) {
                this.addConsoleLog(line, 'stdout');
            }
        },

        handleServerStderr(data) {
            const { uuid, line } = data;

            // Add to console if console is open for this server
            if (this.consoleModal.visible && this.consoleModal.serverUuid === uuid) {
                this.addConsoleLog(line, 'stderr');
            }
        },

        handleServerStarted(data) {
            const { uuid } = data;
            const server = this.servers.find(s => s.uuid === uuid);

            if (server) {
                this.addNotification({
                    type: 'server_started',
                    title: 'サーバー起動',
                    message: `"${server.name}" が起動しました`,
                    serverUuid: uuid,
                    serverName: server.name,
                    timestamp: new Date().toISOString()
                });

                this.showToast(`サーバー "${server.name}" が起動しました`, 'success');

                // Reload server list to update status
                this.loadServers();
            }
        },

        handleServerStopped(data) {
            const { uuid, exitCode } = data;
            const server = this.servers.find(s => s.uuid === uuid);

            if (server) {
                const message = exitCode === 0
                    ? `"${server.name}" が正常に停止しました`
                    : `"${server.name}" が停止しました (Exit Code: ${exitCode})`;

                this.addNotification({
                    type: 'server_stopped',
                    title: 'サーバー停止',
                    message: message,
                    serverUuid: uuid,
                    serverName: server.name,
                    exitCode: exitCode,
                    timestamp: new Date().toISOString()
                });

                this.showToast(message, exitCode === 0 ? 'info' : 'warning');

                // If console is open for this server, mark it as stopped
                if (this.consoleModal.visible && this.consoleModal.serverUuid === uuid) {
                    this.consoleModal.isServerRunning = false;
                    this.addConsoleLog(`\n--- サーバーが停止しました (Exit Code: ${exitCode}) ---\n`, 'system');
                }

                // Reload server list to update status
                this.loadServers();
            }
        },

        handleServerCrashed(data) {
            const { uuid, error } = data;
            const server = this.servers.find(s => s.uuid === uuid);

            if (server) {
                this.addNotification({
                    type: 'server_crashed',
                    title: 'サーバークラッシュ',
                    message: `"${server.name}" がクラッシュしました: ${error}`,
                    serverUuid: uuid,
                    serverName: server.name,
                    error: error,
                    timestamp: new Date().toISOString()
                });

                this.showToast(`サーバー "${server.name}" がクラッシュしました`, 'error');

                // If console is open for this server, mark it as crashed
                if (this.consoleModal.visible && this.consoleModal.serverUuid === uuid) {
                    this.consoleModal.isServerRunning = false;
                    this.addConsoleLog(`\n--- サーバーがクラッシュしました: ${error} ---\n`, 'error');
                }

                // Reload server list
                this.loadServers();
            }
        },

        handleServerAutoRestarted(data) {
            const { uuid, consecutiveCount } = data;
            const server = this.servers.find(s => s.uuid === uuid);

            if (server) {
                this.addNotification({
                    type: 'server_auto_restarted',
                    title: '自動再起動',
                    message: `"${server.name}" が自動再起動しました (${consecutiveCount}回目)`,
                    serverUuid: uuid,
                    serverName: server.name,
                    consecutiveCount: consecutiveCount,
                    timestamp: new Date().toISOString()
                });

                this.showToast(`サーバー "${server.name}" が自動再起動しました`, 'info');
            }
        },

        handleServerAutoRestartLimitReached(data) {
            const { uuid } = data;
            const server = this.servers.find(s => s.uuid === uuid);

            if (server) {
                this.addNotification({
                    type: 'server_auto_restart_limit_reached',
                    title: '自動再起動上限到達',
                    message: `"${server.name}" の自動再起動が上限に達しました`,
                    serverUuid: uuid,
                    serverName: server.name,
                    timestamp: new Date().toISOString()
                });

                this.showToast(`サーバー "${server.name}" の自動再起動が上限に達しました`, 'error');
            }
        },

        handleServerStopTimeout(data) {
            const { uuid, message } = data;
            const server = this.servers.find(s => s.uuid === uuid);

            if (server) {
                this.addNotification({
                    type: 'server_stop_timeout',
                    title: '停止タイムアウト',
                    message: `"${server.name}": ${message}`,
                    serverUuid: uuid,
                    serverName: server.name,
                    timestamp: new Date().toISOString()
                });

                this.showToast(`サーバー "${server.name}" の停止がタイムアウトしました`, 'warning');
            }
        },

        handleServerForcedKill(data) {
            const { uuid } = data;
            const server = this.servers.find(s => s.uuid === uuid);

            if (server) {
                this.addNotification({
                    type: 'server_forced_kill',
                    title: '強制終了',
                    message: `"${server.name}" が強制終了されました`,
                    serverUuid: uuid,
                    serverName: server.name,
                    timestamp: new Date().toISOString()
                });

                this.showToast(`サーバー "${server.name}" が強制終了されました`, 'warning');
            }
        },

        addNotification(notification) {
            notification.id = Date.now() + Math.random();
            notification.read = false;
            this.notifications.unshift(notification);
            this.unreadNotificationCount++;

            // Keep only last 50 notifications
            if (this.notifications.length > 50) {
                this.notifications = this.notifications.slice(0, 50);
            }
        },

        markNotificationAsRead(notificationId) {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
            }
        },

        markAllNotificationsAsRead() {
            this.notifications.forEach(n => n.read = true);
            this.unreadNotificationCount = 0;
        },

        clearNotification(notificationId) {
            const index = this.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                const notification = this.notifications[index];
                if (!notification.read) {
                    this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
                }
                this.notifications.splice(index, 1);
            }
        },

        clearAllNotifications() {
            this.notifications = [];
            this.unreadNotificationCount = 0;
        },

        toggleNotificationPanel() {
            this.showNotificationPanel = !this.showNotificationPanel;
        },

        showToast(message, type = 'info') {
            const toast = {
                id: Date.now() + Math.random(),
                message,
                type,
                timestamp: new Date().toISOString()
            };

            this.toasts.push(toast);

            // Auto remove after 5 seconds
            setTimeout(() => {
                const index = this.toasts.findIndex(t => t.id === toast.id);
                if (index !== -1) {
                    this.toasts.splice(index, 1);
                }
            }, 5000);
        },

        removeToast(toastId) {
            const index = this.toasts.findIndex(t => t.id === toastId);
            if (index !== -1) {
                this.toasts.splice(index, 1);
            }
        }
    };
}
