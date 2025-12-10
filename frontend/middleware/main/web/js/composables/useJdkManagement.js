// JDK Management Logic
import { API_ENDPOINTS } from '../Endpoints.js';
import { validateJsonResponse } from '../utils/helpers.js';

export function createJdkManagementMethods() {
    return {
        /**
         * Load all installed JDKs from the server
         */
        async loadInstalledJdks() {
            this.jdkManagementLoading = true;
            try {
                const response = await fetch(API_ENDPOINTS.jdk.installList, {
                    credentials: 'include'
                });
                
                const data = await validateJsonResponse(response);
                
                if (data.ok && Array.isArray(data.list)) {
                    this.installedJdks = data.list;
                } else {
                    this.showError('インストール済みJDKの取得に失敗しました');
                    this.installedJdks = [];
                }
            } catch (error) {
                console.error('Load installed JDKs error:', error);
                this.showError(`JDK一覧の取得中にエラーが発生しました: ${error.message}`);
                this.installedJdks = [];
            } finally {
                this.jdkManagementLoading = false;
            }
        },

        /**
         * Check if a JDK is being used by any server
         */
        isJdkInUse(jdkVersion) {
            return this.servers.some(server => 
                server.launchConfig?.jdkVersion === jdkVersion
            );
        },

        /**
         * Get list of servers using a specific JDK
         */
        getServersUsingJdk(jdkVersion) {
            return this.servers.filter(server => 
                server.launchConfig?.jdkVersion === jdkVersion
            );
        },

        /**
         * Show confirmation dialog before deleting JDK
         */
        confirmDeleteJdk(jdk) {
            // Check if JDK is in use
            const serversUsingJdk = this.getServersUsingJdk(jdk.majorVersion);
            
            if (serversUsingJdk.length > 0) {
                const serverNames = serversUsingJdk.map(s => s.name).join(', ');
                this.showError(
                    `JDK ${jdk.majorVersion} は以下のサーバーで使用中です: ${serverNames}。` +
                    `先にサーバーを削除または停止してください。`
                );
                return;
            }

            // Show confirmation modal
            this.jdkToDelete = jdk;
            this.showDeleteJdkModal = true;
        },

        /**
         * Cancel JDK deletion
         */
        cancelDeleteJdk() {
            this.jdkToDelete = null;
            this.showDeleteJdkModal = false;
        },

        /**
         * Delete a JDK from the system
         */
        async deleteJdk() {
            if (!this.jdkToDelete) return;

            const jdk = this.jdkToDelete;
            
            try {
                const response = await fetch(API_ENDPOINTS.jdk.remove(jdk.id), {
                    method: 'DELETE',
                    credentials: 'include'
                });

                const data = await validateJsonResponse(response);

                if (data.ok || data.success) {
                    this.showSuccess(`✅ JDK ${jdk.majorVersion} を削除しました`);
                    // Reload the JDK list
                    await this.loadInstalledJdks();
                } else {
                    this.showError(data.error || data.message || 'JDKの削除に失敗しました');
                }
            } catch (error) {
                console.error('Delete JDK error:', error);
                this.showError(`JDK削除中にエラーが発生しました: ${error.message}`);
            } finally {
                this.cancelDeleteJdk();
            }
        },

        /**
         * Format file size in bytes to human-readable format
         */
        formatFileSize(bytes) {
            if (!bytes) return '不明';
            const sizes = ['B', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 B';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }
    };
}

