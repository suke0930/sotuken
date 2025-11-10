// Server Console Management
import { API_ENDPOINTS } from '../Endpoints.js';
import { validateJsonResponse } from '../utils/helpers.js';

export function createConsoleMethods() {
    return {
        async openConsole(server) {
            this.consoleModal = {
                visible: true,
                serverUuid: server.uuid,
                serverName: server.name,
                logs: [],
                command: '',
                isServerRunning: server.status === 'running',
                autoScroll: true,
                showTimestamp: true,  // Toggle for timestamp/log level display
                totalLogCount: 0
            };

            // Subscribe to this server's output for real-time updates
            this.subscribeToServer(server.uuid);

            // Load existing logs from backend
            await this.loadExistingLogs(server.uuid);

            // Add initial message if no logs loaded
            if (this.consoleModal.logs.length === 0) {
                this.addConsoleLog(`=== Console for "${server.name}" ===\n`, 'system');
                this.addConsoleLog(`Server UUID: ${server.uuid}\n`, 'system');
                this.addConsoleLog(`Status: ${server.status}\n\n`, 'system');

                if (server.status !== 'running') {
                    this.addConsoleLog('--- サーバーは現在停止しています ---\n', 'warning');
                }
            }
        },

        async loadExistingLogs(serverUuid) {
            try {
                const response = await fetch(API_ENDPOINTS.server.logs(serverUuid) + '?limit=1000', {
                    method: 'GET',
                    credentials: 'include'
                });

                const result = await validateJsonResponse(response);

                if (result.ok && result.data.logs) {
                    // Load existing logs
                    this.consoleModal.logs = result.data.logs.map(log => ({
                        id: Date.now() + Math.random(),
                        line: log.line,
                        type: log.type,
                        timestamp: log.timestamp,
                        rawLine: log.line  // Store original line for filtering
                    }));

                    this.consoleModal.totalLogCount = result.data.totalLogCount;

                    // Auto-scroll to bottom
                    this.$nextTick(() => {
                        const terminal = document.querySelector('.console-terminal');
                        if (terminal) {
                            terminal.scrollTop = terminal.scrollHeight;
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to load existing logs:', error);
                this.addConsoleLog(`ログの読み込みに失敗しました: ${error.message}\n`, 'error');
            }
        },

        async clearServerLogs() {
            if (!confirm('サーバーログをクリアしますか？この操作は元に戻せません。')) {
                return;
            }

            try {
                const response = await fetch(API_ENDPOINTS.server.clearLogs(this.consoleModal.serverUuid), {
                    method: 'DELETE',
                    credentials: 'include'
                });

                const result = await validateJsonResponse(response);

                if (result.ok) {
                    this.consoleModal.logs = [];
                    this.consoleModal.totalLogCount = 0;
                    this.addConsoleLog('--- ログがクリアされました ---\n', 'system');
                    this.showSuccess(result.message || 'ログをクリアしました');
                } else {
                    this.addConsoleLog(`ログのクリアに失敗: ${result.message}\n`, 'error');
                }
            } catch (error) {
                console.error('Failed to clear logs:', error);
                this.addConsoleLog(`ログのクリアエラー: ${error.message}\n`, 'error');
            }
        },

        toggleTimestampDisplay() {
            this.consoleModal.showTimestamp = !this.consoleModal.showTimestamp;
        },

        formatLogLine(log) {
            if (!log.rawLine) {
                return log.line;
            }

            // If showing timestamp/log level, return original line
            if (this.consoleModal.showTimestamp) {
                return log.line;
            }

            // Remove timestamp and log level patterns like [01:09:36 INFO]:
            const line = log.line;
            const pattern = /^\[([\d:]+)\s+(INFO|WARN|ERROR|DEBUG|TRACE)\]:\s*/;
            return line.replace(pattern, '');
        },

        closeConsole() {
            if (this.consoleModal.serverUuid) {
                // Unsubscribe from server output
                this.unsubscribeFromServer(this.consoleModal.serverUuid);
            }

            this.consoleModal.visible = false;
            this.consoleModal.serverUuid = null;
            this.consoleModal.serverName = '';
            this.consoleModal.logs = [];
            this.consoleModal.command = '';
        },

        addConsoleLog(line, type = 'stdout') {
            this.consoleModal.logs.push({
                id: Date.now() + Math.random(),
                line: line,
                type: type, // 'stdout', 'stderr', 'system', 'warning', 'error'
                timestamp: new Date().toISOString(),
                rawLine: line  // Store original line for filtering
            });

            // Keep only last 1000 lines for performance
            if (this.consoleModal.logs.length > 1000) {
                this.consoleModal.logs = this.consoleModal.logs.slice(-1000);
            }

            // Auto-scroll if enabled
            if (this.consoleModal.autoScroll) {
                this.$nextTick(() => {
                    const terminal = document.querySelector('.console-terminal');
                    if (terminal) {
                        terminal.scrollTop = terminal.scrollHeight;
                    }
                });
            }
        },

        async sendConsoleCommand() {
            const command = this.consoleModal.command.trim();

            if (!command) {
                return;
            }

            if (!this.consoleModal.isServerRunning) {
                this.addConsoleLog('エラー: サーバーが起動していないため、コマンドを送信できません\n', 'error');
                return;
            }

            // Add command to console log
            this.addConsoleLog(`> ${command}\n`, 'system');

            try {
                const response = await fetch(API_ENDPOINTS.server.command(this.consoleModal.serverUuid), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ command })
                });

                const data = await validateJsonResponse(response);

                if (!data.ok) {
                    this.addConsoleLog(`コマンド送信失敗: ${data.error || 'Unknown error'}\n`, 'error');
                }

                // Clear command input
                this.consoleModal.command = '';

            } catch (error) {
                console.error('Failed to send command:', error);
                this.addConsoleLog(`コマンド送信エラー: ${error.message}\n`, 'error');
            }
        },

        handleConsoleKeydown(event) {
            // Send command on Enter (without Shift)
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.sendConsoleCommand();
            }
        },

        toggleAutoScroll() {
            this.consoleModal.autoScroll = !this.consoleModal.autoScroll;

            if (this.consoleModal.autoScroll) {
                // Scroll to bottom
                this.$nextTick(() => {
                    const terminal = document.querySelector('.console-terminal');
                    if (terminal) {
                        terminal.scrollTop = terminal.scrollHeight;
                    }
                });
            }
        },

        handleTerminalScroll(event) {
            const terminal = event.target;
            const isAtBottom = terminal.scrollHeight - terminal.scrollTop <= terminal.clientHeight + 50;

            // Auto-disable autoscroll if user scrolls up
            if (!isAtBottom && this.consoleModal.autoScroll) {
                this.consoleModal.autoScroll = false;
            }

            // Auto-enable autoscroll if user scrolls to bottom
            if (isAtBottom && !this.consoleModal.autoScroll) {
                this.consoleModal.autoScroll = true;
            }
        }
    };
}
