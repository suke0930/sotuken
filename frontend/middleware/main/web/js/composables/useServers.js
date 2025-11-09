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
                        this.servers = data.data || [];
                        this.serversLoading = false;
                        // Update used ports
                        this.updateUsedPorts();
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

        updateUsedPorts() {
            this.usedPorts = this.servers.map(server => server.launchConfig?.port).filter(Boolean);
        },

        checkPortAvailability(port) {
            const portNum = parseInt(port);

            // Well-known ports check (0-1023)
            if (portNum < 1024) {
                this.portWarning = 'ウェルノウンポート（0-1023）は使用できません';
                return;
            }

            // Check if port is already used
            if (this.usedPorts.includes(portNum)) {
                this.portWarning = `ポート ${portNum} は既に使用されています`;
                return;
            }

            // Valid port
            this.portWarning = '';
        },

        checkServerNameAvailability(name) {
            const serverName = (name || '').toString().trim();
            
            // Check if server name is empty
            if (!serverName) {
                return true;  // Allow empty (required validation handles this)
            }
            
            // Skip check if editing an existing server
            if (this.editingServer) {
                return true;
            }
            
            // Check if name already exists (case-insensitive)
            const existingServer = this.servers.find(server => 
                server.name.toLowerCase() === serverName.toLowerCase()
            );
            
            if (existingServer) {
                // Store the duplicate name and show modal
                this.duplicateServerName = serverName;
                this.showDuplicateNameModal = true;
                return false;
            }
            
            return true;
        },

        closeDuplicateNameModal() {
            this.showDuplicateNameModal = false;
            this.duplicateServerName = '';
            // Don't clear the field - let user edit the existing name
        },

        findAvailablePort() {
            let port = 25565;
            while (this.usedPorts.includes(port) || port < 1024) {
                port++;
            }
            return port;
        },

        async checkJdkInstalled(version) {
            this.jdkCheckLoading = true;
            this.jdkInstalled = false;

            try {
                const response = await fetch(API_ENDPOINTS.jdk.getByVersion(version), {
                    credentials: 'include'
                });
                const data = await validateJsonResponse(response);

                if (data.ok && data.list && data.list.success) {
                    this.jdkInstalled = true;
                } else {
                    this.jdkInstalled = false;
                }
            } catch (error) {
                console.error('JDK check error:', error);
                this.jdkInstalled = false;
            } finally {
                this.jdkCheckLoading = false;
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

        async prepareCreateTab() {
            if (this.editingServer) {
                return;
            }
            if (this.isFetchingServerList) {
                return;
            }

            // Set default port to available one
            this.serverForm.port = this.findAvailablePort();

            // Fetch server list and JDK list
            await Promise.all([
                this.fetchServerList({ lockUI: true }),
                this.fetchJdkList()
            ]);
        },

        async fetchJdkList() {
            try {
                const response = await fetch(API_ENDPOINTS.list.jdk, {
                    credentials: 'include'
                });
                const data = await validateJsonResponse(response);

                if (data.success && data.data) {
                    this.jdkListData = data.data;
                } else {
                    console.error('Failed to fetch JDK list:', data);
                }
            } catch (error) {
                console.error('Error fetching JDK list:', error);
            }
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
            if (this.editingServer) {
                await this.updateServer();
                return;
            }

            // Show creation modal
            await this.startServerCreation();
        },

        async startServerCreation() {
            // Prepare operations list
            const operations = this.prepareOperationsList();

            // Initialize modal
            this.creationModal = {
                visible: true,
                step: '',
                status: 'running',
                message: '',
                logs: [],
                operations: operations,
                currentOperation: null,
                progress: 0,
                canClose: false,
                error: null
            };

            try {
                // Execute operations
                await this.executeServerCreation();

                // Success
                this.creationModal.status = 'success';
                this.creationModal.message = 'サーバーの作成が完了しました！';
                this.creationModal.canClose = true;
            } catch (error) {
                // Error
                this.creationModal.status = 'error';
                this.creationModal.message = error.message || 'サーバーの作成に失敗しました';
                this.creationModal.error = error;
                this.creationModal.canClose = true;
            }
        },

        prepareOperationsList() {
            const operations = [];
            const jdkVersion = this.requiredJdkVersion;

            if (!this.jdkInstalled && jdkVersion) {
                operations.push({
                    id: 'download-jdk',
                    label: `JDK ${jdkVersion} のダウンロード`,
                    status: 'pending'
                });
                operations.push({
                    id: 'install-jdk',
                    label: `JDK ${jdkVersion} のインストール`,
                    status: 'pending'
                });
            }

            operations.push({
                id: 'download-server',
                label: `サーバー "${this.serverForm.serverSoftware}-${this.serverForm.minecraftVersion}" のダウンロード`,
                status: 'pending'
            });

            operations.push({
                id: 'create-instance',
                label: `インスタンス "${this.serverForm.serverName}" の作成`,
                status: 'pending'
            });

            return operations;
        },

        updateOperationStatus(operationId, status, message = '') {
            const operation = this.creationModal.operations.find(op => op.id === operationId);
            if (operation) {
                operation.status = status;
                if (message) {
                    operation.message = message;
                }
            }

            if (status === 'running') {
                this.creationModal.currentOperation = operationId;
            }

            // Update progress
            const completed = this.creationModal.operations.filter(op => op.status === 'completed').length;
            this.creationModal.progress = Math.floor((completed / this.creationModal.operations.length) * 100);
        },

        addLog(message, type = 'info') {
            this.creationModal.logs.push({
                timestamp: new Date().toLocaleTimeString(),
                message,
                type
            });
        },

        closeCreationModal() {
            if (!this.creationModal.canClose) {
                if (!confirm('処理を中断しますか？')) {
                    return;
                }
            }

            this.creationModal.visible = false;

            // If success, reload servers and switch tab
            if (this.creationModal.status === 'success') {
                this.resetForm();
                this.loadServers();
                setTimeout(() => this.switchTab('servers'), 500);
            }
        },

        retryServerCreation() {
            this.startServerCreation();
        },

        async executeServerCreation() {
            const jdkVersion = this.requiredJdkVersion;

            // Step 1: Check JDK (again)
            this.addLog('JDKの存在確認中...');
            const jdkCheck = await this.checkJdkInstalledForCreation(jdkVersion);

            let jdkDownloadUrl = null;
            let serverDownloadUrl = null;

            // Step 2 & 3: Download and install JDK if needed
            if (!jdkCheck) {
                // Get JDK download URL
                this.updateOperationStatus('download-jdk', 'running');
                this.addLog(`JDK ${jdkVersion} のダウンロードURL取得中...`);
                jdkDownloadUrl = await this.getJdkDownloadUrl(jdkVersion);

                if (!jdkDownloadUrl) {
                    throw new Error(`JDK ${jdkVersion} のダウンロードURLが見つかりません`);
                }

                // Download JDK
                this.addLog(`JDK ${jdkVersion} をダウンロード中...`);
                const jdkFilename = await this.downloadFile(jdkDownloadUrl, 'jdk');
                this.updateOperationStatus('download-jdk', 'completed');

                // Install JDK
                this.updateOperationStatus('install-jdk', 'running');
                this.addLog(`JDK ${jdkVersion} をインストール中...`);
                await this.installJdk(jdkFilename, jdkVersion);
                this.updateOperationStatus('install-jdk', 'completed');
                this.addLog(`JDK ${jdkVersion} のインストールが完了しました`);
            } else {
                this.addLog(`JDK ${jdkVersion} は既にインストールされています`);
            }

            // Step 4: Download server software
            this.updateOperationStatus('download-server', 'running');
            this.addLog('サーバーソフトウェアのダウンロードURL取得中...');
            serverDownloadUrl = await this.getServerDownloadUrl(
                this.serverForm.serverSoftware,
                this.serverForm.minecraftVersion
            );

            if (!serverDownloadUrl) {
                throw new Error('サーバーソフトウェアのダウンロードURLが見つかりません');
            }

            this.addLog('サーバーソフトウェアをダウンロード中...');
            const serverFilename = await this.downloadFile(serverDownloadUrl, 'server');
            this.updateOperationStatus('download-server', 'completed');
            this.addLog('サーバーソフトウェアのダウンロードが完了しました');

            // Step 5: Create server instance
            this.updateOperationStatus('create-instance', 'running');
            this.addLog('サーバーインスタンスを作成中...');
            await this.createServerInstance(serverFilename);
            this.updateOperationStatus('create-instance', 'completed');
            this.addLog('サーバーインスタンスの作成が完了しました');
        },

        async checkJdkInstalledForCreation(version) {
            try {
                const response = await fetch(API_ENDPOINTS.jdk.getByVersion(version), {
                    credentials: 'include'
                });
                const data = await validateJsonResponse(response);
                return data.ok && data.list && data.list.success;
            } catch (error) {
                return false;
            }
        },

        async getJdkDownloadUrl(version) {
            try {
                if (!this.jdkListData) {
                    const response = await fetch(API_ENDPOINTS.list.jdk, {
                        credentials: 'include'
                    });
                    const data = await validateJsonResponse(response);
                    this.jdkListData = data.data;
                }

                const jdk = this.jdkListData.find(j => j.version === version.toString());
                if (!jdk) return null;

                // Get the first available download (prefer windows for now)
                const download = jdk.downloads.find(d => d.os === 'windows') || jdk.downloads[0];
                return download ? download.downloadUrl : null;
            } catch (error) {
                console.error('Error getting JDK download URL:', error);
                return null;
            }
        },

        async getServerDownloadUrl(software, version) {
            try {
                if (!this.serverListData) {
                    await this.fetchServerList();
                }

                const serverSoftware = this.serverListData.find(s =>
                    s.name.toLowerCase() === software.toLowerCase()
                );

                if (!serverSoftware) return null;

                const versionData = serverSoftware.versions.find(v => v.version === version);
                return versionData ? versionData.downloadUrl : null;
            } catch (error) {
                console.error('Error getting server download URL:', error);
                return null;
            }
        },

        async downloadFile(url, type) {
            // Extract filename from URL
            const filename = url.split('/').pop();

            // Start download request
            const response = await fetch(API_ENDPOINTS.download.start, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ url })
            });

            const data = await validateJsonResponse(response);

            if (!data.success) {
                throw new Error(data.error || 'ダウンロードの開始に失敗しました');
            }

            // Wait for download to complete via WebSocket
            await this.waitForDownloadCompletion(filename);

            return filename;
        },

        waitForDownloadCompletion(filename) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('ダウンロードがタイムアウトしました'));
                }, 300000); // 5 minutes timeout

                const checkCompletion = (message) => {
                    if (message.type === 'download_complete' && message.data?.filename === filename) {
                        clearTimeout(timeout);
                        resolve();
                    } else if (message.type === 'download_error' && message.data?.filename === filename) {
                        clearTimeout(timeout);
                        reject(new Error(message.data?.error || 'ダウンロードエラー'));
                    } else if (message.type === 'download_progress' && message.data?.filename === filename) {
                        // Update progress log
                        const progress = Math.floor(message.data.percentage || 0);
                        this.addLog(`ダウンロード中: ${progress}% (${filename})`, 'info');
                    }
                };

                // Add listener to WebSocket
                if (this.ws) {
                    this.ws.addEventListener('message', (event) => {
                        try {
                            const message = JSON.parse(event.data);
                            checkCompletion(message);
                        } catch (e) {
                            console.error('Failed to parse WebSocket message:', e);
                        }
                    });
                } else {
                    clearTimeout(timeout);
                    reject(new Error('WebSocket接続がありません'));
                }
            });
        },

        async installJdk(filename, majorVersion) {
            const response = await fetch(API_ENDPOINTS.jdk.add, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    archivePath: filename,
                    majorVersion: majorVersion
                })
            });

            const data = await validateJsonResponse(response);

            if (!data.success) {
                throw new Error(data.error || 'JDKのインストールに失敗しました');
            }

            return data;
        },

        async createServerInstance(serverBinaryFilePath) {
            const payload = {
                name: this.serverForm.serverName,
                note: this.serverForm.note,
                software: {
                    name: this.serverForm.serverSoftware,
                    version: this.serverForm.minecraftVersion
                },
                jdkVersion: this.requiredJdkVersion,
                port: this.serverForm.port,
                maxMemory: this.serverForm.maxMemory,
                minMemory: this.serverForm.minMemory,
                serverBinaryFilePath: serverBinaryFilePath
            };

            const response = await fetch(API_ENDPOINTS.server.create, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const data = await validateJsonResponse(response);

            if (!data.ok) {
                throw new Error(data.err || 'サーバーインスタンスの作成に失敗しました');
            }

            return data;
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
            const confirmMessage = `本当に "${server.name}" を削除しますか?\n\nこの操作は取り消せません。\n- サーバー名: ${server.name}\n- バージョン: ${server.software.version}\n- ソフトウェア: ${server.software.name}`;

            if (!confirm(confirmMessage)) return;

            try {
                const data = await apiDelete(API_ENDPOINTS.server.delete(server.uuid));

                if (data.ok) {
                    this.showSuccess(`🗑️ "${server.name}" を削除しました。`);
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
                jdkVersion: '',
                note: '',
                port: this.findAvailablePort(),
                maxMemory: 1024,
                minMemory: 512
            };
            this.availableVersions = [];
            this.portWarning = '';
            this.jdkInstalled = false;
            this.showDuplicateNameModal = false;
            this.duplicateServerName = '';
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
        },

        async startServer(server) {
            try {
                const response = await fetch(API_ENDPOINTS.server.run(server.uuid), {
                    credentials: 'include'
                });
                const data = await validateJsonResponse(response);

                if (data.ok) {
                    this.showSuccess(`サーバー "${server.name}" を起動しています...`);
                    await this.loadServers();
                } else {
                    this.showError(data.error || 'サーバーの起動に失敗しました');
                }
            } catch (error) {
                console.error('Server start error:', error);
                this.showError('サーバー起動中にエラーが発生しました');
            }
        },

        async stopServer(server) {
            try {
                const response = await fetch(API_ENDPOINTS.server.stop(server.uuid), {
                    credentials: 'include'
                });
                const data = await validateJsonResponse(response);

                if (data.ok) {
                    this.showSuccess(`サーバー "${server.name}" を停止しています...`);
                    await this.loadServers();
                } else {
                    this.showError(data.error || 'サーバーの停止に失敗しました');
                }
            } catch (error) {
                console.error('Server stop error:', error);
                this.showError('サーバー停止中にエラーが発生しました');
            }
        },

        // Server Update Methods
        openUpdateModal(server) {
            this.updateModal = {
                visible: true,
                step: 'select',
                server: server,
                newSoftware: server.software.name,
                newVersion: '',
                availableVersions: [],
                requiredJdk: null,
                newJdkRequired: false,
                jdkInstalled: false,
                createBackup: true,
                operations: [],
                logs: [],
                error: null
            };
            
            // Load available versions for current software
            this.loadUpdateVersions();
        },

        async loadUpdateVersions() {
            if (!this.serverListData) {
                await this.fetchServerList();
            }
            
            const software = this.serverListData.find(s =>
                s.name.toLowerCase() === this.updateModal.newSoftware.toLowerCase()
            );
            
            if (software && software.versions) {
                this.updateModal.availableVersions = software.versions;
            }
        },

        async checkUpdateJdk() {
            if (!this.updateModal.newVersion) return;
            
            const versionData = this.updateModal.availableVersions.find(
                v => v.version === this.updateModal.newVersion
            );
            
            if (versionData && versionData.jdkVersion) {
                this.updateModal.requiredJdk = versionData.jdkVersion;
                
                // Check if current JDK matches
                const currentJdk = this.updateModal.server.launchConfig.jdkVersion;
                this.updateModal.newJdkRequired = currentJdk !== versionData.jdkVersion;
                
                if (this.updateModal.newJdkRequired) {
                    // Check if required JDK is installed
                    const jdkCheck = await this.checkJdkInstalledForCreation(versionData.jdkVersion);
                    this.updateModal.jdkInstalled = jdkCheck;
                }
            }
        },

        async startUpdate() {
            this.updateModal.step = 'progress';
            this.updateModal.operations = this.prepareUpdateOperations();
            this.updateModal.logs = [];
            
            try {
                await this.executeServerUpdate();
                this.updateModal.step = 'complete';
            } catch (error) {
                console.error('Update error:', error);
                this.updateModal.step = 'error';
                this.updateModal.error = error.message || 'サーバーの更新に失敗しました';
            }
        },

        prepareUpdateOperations() {
            const operations = [];
            
            if (this.updateModal.createBackup) {
                operations.push({
                    id: 'backup',
                    label: '現在のサーバーをバックアップ中',
                    status: 'pending'
                });
            }
            
            if (this.updateModal.newJdkRequired && !this.updateModal.jdkInstalled) {
                operations.push({
                    id: 'download-jdk',
                    label: `JDK ${this.updateModal.requiredJdk} のダウンロード`,
                    status: 'pending'
                });
                operations.push({
                    id: 'install-jdk',
                    label: `JDK ${this.updateModal.requiredJdk} のインストール`,
                    status: 'pending'
                });
            }
            
            operations.push({
                id: 'download-server',
                label: '新しいサーバーソフトウェアのダウンロード',
                status: 'pending'
            });
            
            operations.push({
                id: 'update-server',
                label: 'サーバーの更新',
                status: 'pending'
            });
            
            return operations;
        },

        updateUpdateOperation(operationId, status) {
            const operation = this.updateModal.operations.find(op => op.id === operationId);
            if (operation) {
                operation.status = status;
            }
        },

        addUpdateLog(message) {
            this.updateModal.logs.push({
                timestamp: new Date().toLocaleTimeString(),
                message: message
            });
        },

        async executeServerUpdate() {
            const server = this.updateModal.server;
            
            // Step 1: Backup (if enabled)
            if (this.updateModal.createBackup) {
                this.updateUpdateOperation('backup', 'running');
                this.addUpdateLog('サーバーをバックアップ中...');
                
                try {
                    await this.backupServer(server.uuid);
                    this.updateUpdateOperation('backup', 'completed');
                    this.addUpdateLog('バックアップ完了');
                } catch (error) {
                    this.addUpdateLog('警告: バックアップ失敗 - ' + error.message);
                    // Continue anyway (backup failure shouldn't stop update)
                }
            }
            
            // Step 2: Download and install JDK if needed
            if (this.updateModal.newJdkRequired && !this.updateModal.jdkInstalled) {
                this.updateUpdateOperation('download-jdk', 'running');
                this.addUpdateLog(`JDK ${this.updateModal.requiredJdk} をダウンロード中...`);
                
                const jdkDownloadUrl = await this.getJdkDownloadUrl(this.updateModal.requiredJdk);
                if (!jdkDownloadUrl) {
                    throw new Error('JDKダウンロードURLが見つかりません');
                }
                
                const jdkFilename = await this.downloadFile(jdkDownloadUrl, 'jdk');
                this.updateUpdateOperation('download-jdk', 'completed');
                
                this.updateUpdateOperation('install-jdk', 'running');
                this.addUpdateLog('JDKをインストール中...');
                await this.installJdk(jdkFilename, this.updateModal.requiredJdk);
                this.updateUpdateOperation('install-jdk', 'completed');
                this.addUpdateLog('JDKインストール完了');
            }
            
            // Step 3: Download new server software
            this.updateUpdateOperation('download-server', 'running');
            this.addUpdateLog('新しいサーバーソフトウェアをダウンロード中...');
            
            const serverDownloadUrl = await this.getServerDownloadUrl(
                this.updateModal.newSoftware,
                this.updateModal.newVersion
            );
            
            if (!serverDownloadUrl) {
                throw new Error('サーバーダウンロードURLが見つかりません');
            }
            
            const serverFilename = await this.downloadFile(serverDownloadUrl, 'server');
            this.updateUpdateOperation('download-server', 'completed');
            this.addUpdateLog('ダウンロード完了');
            
            // Step 4: Update server
            this.updateUpdateOperation('update-server', 'running');
            this.addUpdateLog('サーバーを更新中...');
            
            const updatePayload = {
                serverBinaryFilePath: serverFilename,
                software: {
                    name: this.updateModal.newSoftware,
                    version: this.updateModal.newVersion
                }
            };
            
            if (this.updateModal.newJdkRequired) {
                updatePayload.jdkVersion = this.updateModal.requiredJdk;
            }
            
            const response = await fetch(API_ENDPOINTS.server.update(server.uuid), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updatePayload)
            });
            
            const data = await validateJsonResponse(response);
            
            if (!data.ok) {
                throw new Error(data.message || 'サーバー更新に失敗しました');
            }
            
            this.updateUpdateOperation('update-server', 'completed');
            this.addUpdateLog('サーバー更新完了!');
        },

        async backupServer(serverUuid) {
            // This would call a backup endpoint on your backend
            try {
                const response = await fetch(`/api/mc/backup/${serverUuid}`, {
                    method: 'POST',
                    credentials: 'include'
                });
                
                // If endpoint doesn't exist (404), we'll skip backup
                if (response.status === 404) {
                    this.addUpdateLog('バックアップエンドポイントが見つかりません (スキップ)');
                    return { ok: true, skipped: true };
                }
                
                const data = await validateJsonResponse(response);
                
                if (!data.ok) {
                    throw new Error('バックアップに失敗しました');
                }
                
                return data;
            } catch (error) {
                // If backup fails, log it but don't stop the update
                console.warn('Backup failed:', error);
                throw error;
            }
        },

        closeUpdateModal() {
            if (this.updateModal.step === 'progress') {
                if (!confirm('更新処理を中断しますか？')) {
                    return;
                }
            }
            
            this.updateModal.visible = false;
            
            // If update was successful, reload servers
            if (this.updateModal.step === 'complete') {
                this.loadServers();
            }
        }
    };
}
