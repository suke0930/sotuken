// Server Management Logic
import { API_ENDPOINTS } from '../Endpoints.js';
import { apiRequest, apiPost, apiPut, apiDelete } from '../utils/api.js';
import { validateJsonResponse } from '../utils/helpers.js';

export function createServerMethods() {
    return {
        async loadServers() {
            this.serversLoading = true;
            try {
                const response = await fetch(API_ENDPOINTS.server.list, {
                    credentials: 'include'
                });

                const data = await validateJsonResponse(response);

                if (data.ok) {
                    setTimeout(() => {
                        this.servers = data.servers || [];
                        this.serversLoading = false;
                    }, 300);
                } else {
                    this.showError('サーバー一覧の取得に失敗しました');
                    this.serversLoading = false;
                }
            } catch (error) {
                console.error('Load servers error:', error);
                this.showError(`サーバー一覧の取得中にエラーが発生しました: ${error.message}`);
                this.serversLoading = false;
            }
        },

        async fetchServerList(options = {}) {
            const { lockUI = false } = options;

            if (lockUI) {
                this.lockServerFormControls();
            } else {
                this.isFetchingServerList = true;
                this.serverSoftwareFetchFailed = false;
            }

            let success = false;

            try {
                const data = await apiRequest(API_ENDPOINTS.list.servers);

                if (data.success && data.data) {
                    this.serverListData = data.data;
                    success = true;

                    if (this.serverForm.serverSoftware) {
                        this.loadAvailableVersions(this.serverForm.serverSoftware);
                    }
                } else {
                    console.error('Failed to fetch server list:', data);
                    if (lockUI) {
                        this.handleServerListFetchError();
                    }
                }
            } catch (error) {
                console.error('Error fetching server list:', error);
                if (lockUI) {
                    this.handleServerListFetchError();
                }
            } finally {
                if (lockUI) {
                    if (success) {
                        this.unlockServerFormControls();
                    }
                } else {
                    this.isFetchingServerList = false;
                }
            }

            return success;
        },

        prepareCreateTab() {
            if (this.editingServer) {
                return;
            }
            if (this.isFetchingServerList) {
                return;
            }
            this.fetchServerList({ lockUI: true });
        },

        loadAvailableVersions(serverSoftware) {
            this.loadingVersions = true;
            this.availableVersions = [];

            // Small delay to show loading state
            setTimeout(() => {
                if (!Array.isArray(this.serverListData) || this.serverListData.length === 0) {
                    this.loadingVersions = false;
                    return;
                }

                const normalizedSoftware = (serverSoftware || '').toString().trim().toLowerCase();
                const candidatesFor = (entry) => {
                    return [entry.name, entry.id, entry.slug, entry.key]
                        .filter(Boolean)
                        .map(value => value.toString().trim().toLowerCase());
                };

                let serverData = this.serverListData.find((entry) => {
                    if (!entry) return false;
                    const candidates = candidatesFor(entry);
                    return candidates.includes(normalizedSoftware);
                });

                if (!serverData) {
                    serverData = this.serverListData.find((entry) => {
                        if (!entry) return false;
                        const candidates = candidatesFor(entry);
                        return candidates.some(value => value.includes(normalizedSoftware));
                    });
                }

                if (serverData && Array.isArray(serverData.versions)) {
                    this.availableVersions = serverData.versions;
                } else {
                    this.availableVersions = [];
                }

                if (!this.availableVersions.some(v => v.version === this.serverForm.minecraftVersion)) {
                    this.serverForm.minecraftVersion = '';
                    this.serverForm.jdkVersion = '';
                }

                this.loadingVersions = false;
            }, 100);
        },

        async handleServerSubmit() {
            this.formSubmitting = true;

            // Start download simulation for new feature
            this.startDownloadSimulation();

            try {
                if (this.editingServer) {
                    await this.updateServer();
                } else {
                    await this.createServer();
                }
            } finally {
                this.formSubmitting = false;
            }
        },

        startDownloadSimulation() {
            this.downloadActive = true;
            this.downloadProgress = {
                filename: `${this.serverForm.serverSoftware}-${this.serverForm.minecraftVersion}.jar`,
                percentage: 0,
                downloadedMB: 0,
                totalMB: 45.8,
                speed: 0,
                status: 'ダウンロード中...'
            };

            const interval = setInterval(() => {
                if (this.downloadProgress.percentage >= 100) {
                    clearInterval(interval);
                    this.downloadProgress.status = '完了!';
                    setTimeout(() => {
                        this.downloadActive = false;
                    }, 2000);
                    return;
                }

                const increment = Math.random() * 15 + 5;
                this.downloadProgress.percentage = Math.min(100, this.downloadProgress.percentage + increment);
                this.downloadProgress.downloadedMB = (this.downloadProgress.totalMB * this.downloadProgress.percentage / 100).toFixed(1);
                this.downloadProgress.speed = (Math.random() * 3000 + 1000).toFixed(0);
            }, 500);
        },

        closeDownload() {
            if (this.downloadProgress.percentage < 100) {
                if (confirm('ダウンロードを中止しますか?')) {
                    this.downloadActive = false;
                    this.formSubmitting = false;
                }
            } else {
                this.downloadActive = false;
            }
        },

        async createServer() {
            try {
                console.log('Creating server with data:', this.serverForm);
                const response = await fetch(API_ENDPOINTS.server.create, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(this.serverForm)
                });

                console.log('Response status:', response.status);

                const data = await validateJsonResponse(response);
                console.log('Response data:', data);

                if (data.ok) {
                    this.showSuccess(`🎉 "${this.serverForm.serverName}" が正常に作成されました!`);
                    this.resetForm();
                    await this.loadServers();
                    setTimeout(() => this.switchTab('servers'), 1500);
                } else {
                    this.showError(data.message || 'サーバーの作成に失敗しました');
                }
            } catch (error) {
                console.error('Server creation error:', error);
                this.showError(`サーバー作成中にエラーが発生しました: ${error.message}`);
            }
        },

        async updateServer() {
            try {
                const data = await apiPut(
                    API_ENDPOINTS.server.update(this.editingServer.id),
                    this.serverForm
                );

                if (data.ok) {
                    this.showSuccess(`✅ "${this.serverForm.serverName}" の設定を更新しました!`);
                    this.resetForm();
                    await this.loadServers();
                    setTimeout(() => this.switchTab('servers'), 1500);
                } else {
                    this.showError(data.message || 'サーバーの更新に失敗しました');
                }
            } catch (error) {
                console.error('Server update error:', error);
                this.showError(`サーバー更新中にエラーが発生しました: ${error.message}`);
            }
        },

        editServer(server) {
            this.editingServer = server;
            this.serverForm = {
                serverName: server.serverName,
                minecraftVersion: server.minecraftVersion,
                serverSoftware: server.serverSoftware,
                jdkVersion: server.jdkVersion
            };
            // Load available versions for the selected software
            if (this.serverListData && server.serverSoftware) {
                this.loadAvailableVersions(server.serverSoftware);
            }
            this.switchTab('create');
            this.showSuccess(`${server.serverName} の編集モードに切り替えました。`);
        },

        async deleteServer(server) {
            const confirmMessage = `本当に "${server.serverName}" を削除しますか?\n\nこの操作は取り消せません。\n- サーバー名: ${server.serverName}\n- バージョン: ${server.minecraftVersion}\n- ソフトウェア: ${server.serverSoftware}`;

            if (!confirm(confirmMessage)) return;

            try {
                const data = await apiDelete(API_ENDPOINTS.server.delete(server.id));

                if (data.ok) {
                    this.showSuccess(`🗑️ "${server.serverName}" を削除しました。`);
                    await this.loadServers();
                } else {
                    this.showError(data.message || 'サーバーの削除に失敗しました');
                }
            } catch (error) {
                this.showError('サーバー削除中にエラーが発生しました');
            }
        },

        resetForm() {
            this.editingServer = null;
            this.serverForm = {
                serverName: '',
                minecraftVersion: '',
                serverSoftware: '',
                jdkVersion: ''
            };
            this.availableVersions = [];
        },

        lockServerFormControls() {
            this.isFetchingServerList = true;
            this.serverSoftwareFetchFailed = false;
            this.serverSoftwarePlaceholder = 'サーバー問い合わせ中...';
            this.serverForm.serverSoftware = '';
            this.serverForm.minecraftVersion = '';
            this.serverForm.jdkVersion = '';
            this.availableVersions = [];
        },

        unlockServerFormControls() {
            this.isFetchingServerList = false;
            this.serverSoftwareFetchFailed = false;
            this.serverSoftwarePlaceholder = 'サーバーソフトウェアを選択してください';
        },

        handleServerListFetchError() {
            this.serverSoftwarePlaceholder = 'リストの要求に失敗しました';
            this.isFetchingServerList = false;
            this.serverSoftwareFetchFailed = true;
            this.serverListData = [];
            this.availableVersions = [];
            this.serverForm.minecraftVersion = '';
            this.serverForm.jdkVersion = '';
            if (this.activeTab === 'create') {
                this.showError('サーバーリストの取得に失敗しました');
            }
        }
    };
}
