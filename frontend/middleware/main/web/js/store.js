// Application State Management

export function createStore() {
    return {
        data() {
            return {
                // Loading & Auth
                loading: true,
                isAuthenticated: false,
                authMode: 'login',
                username: '',

                // UI State
                darkMode: false,
                sidebarOpen: false,
                userMenuOpen: false,

                // Auth Forms
                signupForm: { id: '', password: '' },
                loginForm: { id: '', password: '' },
                authMessage: '',
                authMessageType: 'error',

                // Tab Navigation
                activeTab: 'servers',
                tabs: [
                    { id: 'servers', label: 'サーバー一覧', icon: 'fas fa-server' },
                    { id: 'create', label: '新規作成', icon: 'fas fa-plus-circle' },
                    { id: 'settings', label: 'システム設定', icon: 'fas fa-cogs' },
                    { id: 'downloads', label: 'ダウンロード管理', icon: 'fas fa-cloud-download-alt' }
                ],
                sidebarMenu: [
                    { id: 'servers', label: 'サーバー一覧', icon: 'fas fa-server' },
                    { id: 'create', label: '新規作成', icon: 'fas fa-plus-circle' },
                    { id: 'jdk-management', label: 'JDK管理', icon: 'fas fa-coffee' },
                    { id: 'settings', label: 'システム設定', icon: 'fas fa-cogs' },
                    { id: 'downloads', label: 'ダウンロード管理', icon: 'fas fa-cloud-download-alt' },
                    { id: 'about', label: 'About Us', icon: 'fas fa-info-circle' },
                    { id: 'tutorials', label: 'Tutorials', icon: 'fas fa-book' }
                ],

                // Messages
                errorMessage: '',
                successMessage: '',

                // Server Management
                servers: [],
                serversLoading: false,
                editingServer: null,
                serverForm: {
                    serverName: '',
                    minecraftVersion: '',
                    serverSoftware: '',
                    jdkVersion: '',
                    note: '',
                    port: 25565,
                    maxMemory: 1024,
                    minMemory: 512
                },
                serverSoftwarePlaceholder: 'サーバーソフトウェアを選択してください',
                isFetchingServerList: false,
                serverSoftwareFetchFailed: false,
                formSubmitting: false,
                usedPorts: [],
                portWarning: '',
                jdkInstalled: false,
                jdkCheckLoading: false,

                // Step-by-step form data
                serverListData: null,
                availableVersions: [],
                loadingVersions: false,
                jdkListData: null,

                // Server creation workflow
                creationModal: {
                    visible: false,
                    step: '',
                    status: 'running', // 'running', 'success', 'error'
                    message: '',
                    logs: [],
                    operations: [],
                    currentOperation: null,
                    progress: 0,
                    canClose: false,
                    error: null
                },

                // Server update workflow
                updateModal: {
                    visible: false,
                    step: 'edit',
                    server: null,
                    form: {
                        name: '',
                        note: '',
                        port: 25565,
                        maxMemory: 1024,
                        minMemory: 512,
                        jvmArguments: '',
                        serverArguments: '',
                        autoRestart: false,
                        maxConsecutiveRestarts: 3,
                        resetThresholdSeconds: 600
                    },
                    error: null
                },

                // API Test
                apiResponse: 'APIテストボタンをクリックしてください...',

                // WebSocket & Downloads
                wsConnected: false,
                ws: null,
                downloadListType: '',
                downloadListData: null,
                fetchingList: false,
                selectedFile: null,
                startingDownload: false,
                activeDownloads: [],

                // New download progress state for server creation
                downloadActive: false,
                downloadProgress: {
                    filename: '',
                    percentage: 0,
                    downloadedMB: 0,
                    totalMB: 0,
                    speed: 0,
                    status: ''
                },

                // JDK Management
                installedJdks: [],
                jdkManagementLoading: false,
                jdkToDelete: null,
                showDeleteJdkModal: false,

                // Duplicate Server Name Warning
                showDuplicateNameModal: false,
                duplicateServerName: '',

                // Server Console/Terminal
                consoleModal: {
                    visible: false,
                    serverUuid: null,
                    serverName: '',
                    logs: [],
                    command: '',
                    isServerRunning: true,
                    autoScroll: true
                },
                mcWebSocket: null,
                mcWebSocketConnected: false,
                subscribedServers: new Set(),

                // Event Notifications
                notifications: [],
                unreadNotificationCount: 0,
                showNotificationPanel: false,
                toasts: []
            };
        },

        computed: {
            serverSoftwareOptions() {
                const fallbackOptions = [
                    { value: 'vanilla', label: 'サーバーリストの要求に失敗しました' },
                ];

                if (this.isFetchingServerList || this.serverSoftwareFetchFailed) {
                    return [];
                }

                if (!Array.isArray(this.serverListData) || this.serverListData.length === 0) {
                    return fallbackOptions;
                }

                const seen = new Set();
                const options = [];

                for (const entry of this.serverListData) {
                    if (!entry) continue;

                    const rawValue = (entry.key || entry.id || entry.slug || entry.name || '').toString().trim();
                    if (!rawValue) continue;

                    const normalizedKey = rawValue.toLowerCase();
                    if (seen.has(normalizedKey)) continue;
                    seen.add(normalizedKey);

                    const label = (entry.displayName || entry.label || entry.name || rawValue).toString().trim() || rawValue;
                    options.push({ value: rawValue, label });
                }

                if (options.length === 0) {
                    return fallbackOptions;
                }

                return options;
            },

            minecraftVersionPlaceholder() {
                if (this.serverSoftwareFetchFailed) {
                    return 'リストの要求に失敗しました';
                }
                if (this.isFetchingServerList) {
                    return 'ソフトウェアの選択待ち...';
                }
                if (!this.serverForm.serverSoftware) {
                    return 'まずサーバーソフトウェアを選択してください';
                }
                if (!this.serverListData) {
                    return 'サーバーリストを読み込み中...';
                }
                if (this.loadingVersions) {
                    return '読み込み中...';
                }
                if (this.availableVersions.length === 0 && this.serverListData) {
                    return 'バージョンが見つかりません';
                }
                return 'バージョンを選択してください';
            },

            isFormValid() {
                const form = this.serverForm;
                const hasRequiredFields = form.serverName &&
                                         form.minecraftVersion &&
                                         form.serverSoftware &&
                                         form.jdkVersion &&
                                         form.port;
                const noWarnings = !this.portWarning;
                const notLoading = !this.formSubmitting && !this.isFetchingServerList;

                // Check for duplicate name (skip if editing)
                const noDuplicateName = this.editingServer || !this.servers.some(server => 
                    server.name.toLowerCase() === (form.serverName || '').toString().trim().toLowerCase()
                );

                return hasRequiredFields && noWarnings && notLoading && noDuplicateName;
            },

            requiredJdkVersion() {
                if (this.serverForm.jdkVersion) {
                    const match = this.serverForm.jdkVersion.match(/\d+/);
                    return match ? parseInt(match[0]) : null;
                }
                return null;
            }
        },

        watch: {
            'serverForm.serverSoftware'(newValue, oldValue) {
                // Reset version and JDK when software changes
                this.serverForm.minecraftVersion = '';
                this.serverForm.jdkVersion = '';
                this.availableVersions = [];

                // If software is selected, fetch available versions
                if (newValue) {
                    if (this.serverListData) {
                        this.loadAvailableVersions(newValue);
                    }
                }
            },

            'serverForm.minecraftVersion'(newValue) {
                // Auto-select JDK based on selected version
                if (newValue && this.availableVersions.length > 0) {
                    const selectedVersion = this.availableVersions.find(v => v.version === newValue);
                    if (selectedVersion) {
                        this.serverForm.jdkVersion = `OpenJDK ${selectedVersion.jdk}`;
                    }
                } else {
                    this.serverForm.jdkVersion = '';
                }
            },

            serverListData(newValue) {
                // When serverListData loads, if software is already selected, load its versions
                if (newValue && this.serverForm.serverSoftware) {
                    this.loadAvailableVersions(this.serverForm.serverSoftware);
                }
            },

            'serverForm.port'(newValue) {
                this.checkPortAvailability(newValue);
            },

            requiredJdkVersion(newValue) {
                if (newValue) {
                    this.checkJdkInstalled(newValue);
                }
            }
        }
    };
}
