// Server Console Management
import { API_ENDPOINTS } from '../Endpoints.js';
import { validateJsonResponse } from '../utils/helpers.js';

export function createConsoleMethods() {
    return {
        openConsole(server) {
            this.consoleModal = {
                visible: true,
                serverUuid: server.uuid,
                serverName: server.name,
                logs: [],
                command: '',
                isServerRunning: server.status === 'running',
                autoScroll: true
            };

            // Subscribe to this server's output
            this.subscribeToServer(server.uuid);

            // Add initial message
            this.addConsoleLog(`=== Console for "${server.name}" ===\n`, 'system');
            this.addConsoleLog(`Server UUID: ${server.uuid}\n`, 'system');
            this.addConsoleLog(`Status: ${server.status}\n\n`, 'system');

            if (server.status !== 'running') {
                this.addConsoleLog('--- サーバーは現在停止しています ---\n', 'warning');
            }
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
                timestamp: new Date().toISOString()
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
