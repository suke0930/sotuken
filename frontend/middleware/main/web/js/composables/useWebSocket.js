// WebSocket Communication Logic
import { API_ENDPOINTS } from '../Endpoints.js';

export function createWebSocketMethods() {
    return {
        connectWebSocket() {
            this.ws = new WebSocket(API_ENDPOINTS.WS_URL);

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.wsConnected = true;
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('❌ WebSocket disconnected');
                this.wsConnected = false;
                setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        },

        handleWebSocketMessage(message) {
            console.log('📨 WebSocket message:', message);

            switch (message.type) {
                case 'download_progress':
                    this.updateDownloadProgress(message.data);
                    break;
                case 'download_complete':
                    this.handleDownloadComplete(message.data);
                    break;
                case 'download_error':
                    this.handleDownloadError(message.data);
                    break;
            }
        }
    };
}
