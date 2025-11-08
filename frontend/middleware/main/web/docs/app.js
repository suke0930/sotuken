/* Minecraftサーバー管理機能のスクリプト（ダウンロードマネージャー統合版）
 */

// ========================================
// Download Manager Configuration
// ========================================
const DOWNLOAD_API_BASE = 'http://localhost:4000/api';
const DOWNLOAD_WS_URL = 'ws://localhost:4000';

// ========================================
// Download Manager State
// ========================================
let downloadWs = null;
let currentListData = null;
let selectedFile = null;
let activeDownloads = new Map();
/**
 * Minecraftサーバー管理機能のスクリプト
 */

// --- DOM要素 ---
const serversListEl = document.getElementById('serversList');
const serverForm = document.getElementById('serverForm');
const formTitle = document.getElementById('form-title');
const formSubmitButton = document.getElementById('form-submit-button');
const serverIdInput = document.getElementById('serverId');
const errorMessageEl = document.getElementById('errorMessage');
const successMessageEl = document.getElementById('successMessage');

let currentServers = [];

// --- メッセージ表示ヘルパー ---
function showMessage(element, message, type = 'info') {
    element.textContent = message;
    element.className = `message-area ${type}`;
    element.style.display = 'block';
    
    // アニメーション効果
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.style.transition = 'all 0.3s ease';
    }, 100);
    
    setTimeout(() => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            element.style.display = 'none';
        }, 300);
    }, 5000);
}

const showError = (message) => showMessage(errorMessageEl, message, 'error');
const showSuccess = (message) => showMessage(successMessageEl, message, 'success');

// --- HTMLエスケープ ---
function escapeHtml(unsafe) {
    return (unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ========================================
// Download Manager - WebSocket Connection
// ========================================
function connectDownloadWebSocket() {
    downloadWs = new WebSocket(DOWNLOAD_WS_URL);

    downloadWs.onopen = () => {
        console.log('✅ Download WebSocket connected');
        updateDownloadConnectionStatus(true);
    };

    downloadWs.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleDownloadWebSocketMessage(message);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    };

    downloadWs.onclose = () => {
        console.log('❌ Download WebSocket disconnected');
        updateDownloadConnectionStatus(false);
        setTimeout(connectDownloadWebSocket, 3000);
    };

    downloadWs.onerror = (error) => {
        console.error('Download WebSocket error:', error);
    };
}

function handleDownloadWebSocketMessage(message) {
    console.log('📨 WebSocket message:', message);

    switch (message.type) {
        case 'download_progress':
            updateDownloadProgress(message.data);
            break;
        case 'download_complete':
            handleDownloadComplete(message.data);
            break;
        case 'download_error':
            handleDownloadError(message.data);
            break;
        case 'ping':
        case 'pong':
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

function updateDownloadConnectionStatus(connected) {
    const statusEl = document.getElementById('downloadConnectionStatus');
    if (!statusEl) return;

    if (connected) {
        statusEl.className = 'connection-badge connected';
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> 接続済み';
    } else {
        statusEl.className = 'connection-badge disconnected';
        statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> 未接続';
    }
}

// ========================================
// Download Manager - List Fetching
// ========================================
async function fetchDownloadList() {
    const typeSelect = document.getElementById('downloadListType');
    const type = typeSelect.value;

    if (!type) {
        showError('リストタイプを選択してください');
        return;
    }

    const fetchBtn = document.getElementById('fetchDownloadListBtn');
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 読み込み中...';

    try {
        const response = await fetch(`${DOWNLOAD_API_BASE}/list/${type}`);
        const data = await response.json();

        if (data.success) {
            currentListData = data.data;
            displayDownloadListPreview(data.data);
            displayDownloadVersionSelector(data.data, type);
            showSuccess('リストを取得しました');
        } else {
            showError(`エラー: ${data.error.message}`);
        }
    } catch (error) {
        console.error('Failed to fetch list:', error);
        showError('サーバーからのリスト取得に失敗しました');
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = '<i class="fas fa-download"></i> リストを取得';
    }
}

function displayDownloadListPreview(data) {
    const previewEl = document.getElementById('downloadListPreview');
    previewEl.style.display = 'block';
    previewEl.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

function displayDownloadVersionSelector(data, type) {
    const selectorEl = document.getElementById('downloadVersionSelector');
    const buttonsEl = document.getElementById('downloadVersionButtons');
    
    selectorEl.style.display = 'block';
    buttonsEl.innerHTML = '';

    if (type === 'servers') {
        data.forEach(server => {
            const serverSection = document.createElement('div');
            serverSection.style.marginBottom = '20px';

            const serverTitle = document.createElement('h4');
            serverTitle.textContent = server.name;
            serverTitle.style.marginBottom = '10px';
            serverTitle.style.color = '#667eea';
            serverSection.appendChild(serverTitle);

            const versionGrid = document.createElement('div');
            versionGrid.className = 'download-version-grid';

            server.versions.forEach(version => {
                const btn = createDownloadVersionButton(
                    `${version.version} (JDK ${version.jdk})`,
                    {
                        name: server.name,
                        version: version.version,
                        jdk: version.jdk,
                        url: version.downloadUrl,
                        type: 'server'
                    }
                );
                versionGrid.appendChild(btn);
            });

            serverSection.appendChild(versionGrid);
            buttonsEl.appendChild(serverSection);
        });
    } else if (type === 'jdk') {
        data.forEach(jdk => {
            const jdkSection = document.createElement('div');
            jdkSection.style.marginBottom = '20px';

            const jdkTitle = document.createElement('h4');
            jdkTitle.textContent = `JDK ${jdk.version} ${jdk.vendor ? `(${jdk.vendor})` : ''}`;
            jdkTitle.style.marginBottom = '10px';
            jdkTitle.style.color = '#667eea';
            jdkSection.appendChild(jdkTitle);

            const osGrid = document.createElement('div');
            osGrid.className = 'download-version-grid';

            jdk.downloads.forEach(download => {
                const btn = createDownloadVersionButton(
                    download.os.toUpperCase(),
                    {
                        version: jdk.version,
                        os: download.os,
                        url: download.downloadUrl,
                        vendor: jdk.vendor,
                        type: 'jdk'
                    }
                );
                osGrid.appendChild(btn);
            });

            jdkSection.appendChild(osGrid);
            buttonsEl.appendChild(jdkSection);
        });
    }
}

function createDownloadVersionButton(label, fileInfo) {
    const btn = document.createElement('button');
    btn.className = 'download-version-btn';
    btn.textContent = label;
    btn.onclick = () => selectDownloadFile(btn, fileInfo);
    return btn;
}

function selectDownloadFile(button, fileInfo) {
    document.querySelectorAll('.download-version-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    button.classList.add('selected');
    selectedFile = fileInfo;

    const fileInfoEl = document.getElementById('downloadSelectedFileInfo');
    const fileNameEl = document.getElementById('downloadSelectedFileName');
    const fileUrlEl = document.getElementById('downloadSelectedFileUrl');

    fileInfoEl.style.display = 'block';

    if (fileInfo.type === 'server') {
        fileNameEl.textContent = `${fileInfo.name} ${fileInfo.version} (JDK ${fileInfo.jdk})`;
    } else if (fileInfo.type === 'jdk') {
        fileNameEl.textContent = `JDK ${fileInfo.version} - ${fileInfo.os.toUpperCase()}`;
    }

    fileUrlEl.textContent = fileInfo.url;
}

// ========================================
// Download Manager - Download Management
// ========================================
async function startFileDownload() {
    if (!selectedFile) {
        showError('ダウンロードするファイルを選択してください');
        return;
    }

    const downloadBtn = document.getElementById('startDownloadBtn');
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 開始中...';

    try {
        const response = await fetch(`${DOWNLOAD_API_BASE}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: selectedFile.url }),
        });

        const data = await response.json();

        if (data.success) {
            console.log('Download started:', data.data);
            addDownloadItem(data.data.taskId, data.data.status);
            showSuccess('ダウンロードを開始しました');
        } else {
            showError(`エラー: ${data.error.message}`);
        }
    } catch (error) {
        console.error('Failed to start download:', error);
        showError('ダウンロードの開始に失敗しました');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> ダウンロード開始';
    }
}

function addDownloadItem(taskId, status) {
    if (activeDownloads.has(taskId)) {
        return;
    }

    const downloadsListEl = document.getElementById('activeDownloadsList');
    const emptyState = downloadsListEl.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const item = document.createElement('div');
    item.className = 'download-card';
    item.id = `download-${taskId}`;
    item.innerHTML = `
        <div class="download-card-header">
            <div class="download-filename">
                <i class="fas fa-file-download"></i>
                ${escapeHtml(status.filename)}
            </div>
            <div class="download-status-badge status-${status.status}">
                ${status.status.toUpperCase()}
            </div>
        </div>
        <div class="download-progress-container">
            <div class="download-progress-bar" style="width: ${status.percentage}%">
                ${status.percentage.toFixed(1)}%
            </div>
        </div>
        <div class="download-info-grid">
            <div class="download-info-item">
                <span class="download-info-label">ダウンロード済み</span>
                <span class="download-info-value" id="downloaded-${taskId}">0 MB / 0 MB</span>
            </div>
            <div class="download-info-item">
                <span class="download-info-label">速度</span>
                <span class="download-info-value" id="speed-${taskId}">0 KB/s</span>
            </div>
            <div class="download-info-item">
                <span class="download-info-label">残り時間</span>
                <span class="download-info-value" id="remaining-${taskId}">--</span>
            </div>
            <div class="download-info-item">
                <button class="btn btn-danger btn-sm cancel-download-btn" data-task-id="${taskId}" style="display: none;">
                    <i class="fas fa-times"></i> キャンセル
                </button>
            </div>
        </div>
    `;

    downloadsListEl.prepend(item);
    activeDownloads.set(taskId, item);

    updateDownloadProgress(status);
}

function updateDownloadProgress(progress) {
    const item = activeDownloads.get(progress.taskId);
    if (!item) {
        addDownloadItem(progress.taskId, progress);
        return;
    }

    const progressBar = item.querySelector('.download-progress-bar');
    progressBar.style.width = `${progress.percentage}%`;
    progressBar.textContent = `${progress.percentage.toFixed(1)}%`;

    const statusBadge = item.querySelector('.download-status-badge');
    statusBadge.className = `download-status-badge status-${progress.status}`;
    statusBadge.textContent = progress.status.toUpperCase();

    const cancelBtn = item.querySelector('.cancel-download-btn');
    if (cancelBtn) {
        cancelBtn.style.display = progress.status === 'downloading' ? 'inline-block' : 'none';
    }

    const downloadedMB = (progress.downloadedBytes / (1024 * 1024)).toFixed(2);
    const totalMB = (progress.totalBytes / (1024 * 1024)).toFixed(2);
    const speedKB = (progress.speed / 1024).toFixed(2);
    const remainingMin = Math.floor(progress.remainingTime / 60);
    const remainingSec = Math.floor(progress.remainingTime % 60);

    const downloadedEl = document.getElementById(`downloaded-${progress.taskId}`);
    const speedEl = document.getElementById(`speed-${progress.taskId}`);
    const remainingEl = document.getElementById(`remaining-${progress.taskId}`);

    if (downloadedEl) downloadedEl.textContent = `${downloadedMB} MB / ${totalMB} MB`;
    if (speedEl) speedEl.textContent = `${speedKB} KB/s`;
    if (remainingEl) remainingEl.textContent = progress.remainingTime > 0 ? `${remainingMin}分 ${remainingSec}秒` : '--';
}

function handleDownloadComplete(data) {
    console.log('✅ Download completed:', data);

    const item = activeDownloads.get(data.taskId);
    if (item) {
        const statusBadge = item.querySelector('.download-status-badge');
        statusBadge.className = 'download-status-badge status-completed';
        statusBadge.textContent = '完了';

        const cancelBtn = item.querySelector('.cancel-download-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    }

    showSuccess('ダウンロードが完了しました');
}

function handleDownloadError(data) {
    console.error('❌ Download error:', data);

    const item = activeDownloads.get(data.taskId);
    if (item) {
        const statusBadge = item.querySelector('.download-status-badge');
        statusBadge.className = 'download-status-badge status-error';
        statusBadge.textContent = 'エラー';

        const cancelBtn = item.querySelector('.cancel-download-btn');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    }

    showError(`ダウンロードエラー: ${data.error || '不明なエラー'}`);
}

async function cancelFileDownload(taskId) {
    console.log(`Cancelling download: ${taskId}`);
    try {
        const response = await fetch(`${DOWNLOAD_API_BASE}/download/${taskId}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
            console.log(`Download ${taskId} cancelled successfully.`);
            const item = activeDownloads.get(taskId);
            if (item) {
                const statusBadge = item.querySelector('.download-status-badge');
                statusBadge.className = 'download-status-badge status-error';
                statusBadge.textContent = 'キャンセル済み';
                const cancelBtn = item.querySelector('.cancel-download-btn');
                if (cancelBtn) cancelBtn.style.display = 'none';
            }
            showSuccess('ダウンロードをキャンセルしました');
        } else {
            showError(`キャンセル失敗: ${data.error.message}`);
        }
    } catch (error) {
        console.error('Error cancelling download:', error);
        showError('ダウンロードのキャンセル中にエラーが発生しました');
    }
}



// --- API呼び出し ---

async function loadServers() {
    try {
        // ローディング状態の表示
        serversListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #667eea;"></i>
                <h3>サーバー一覧を読み込み中...</h3>
                <p>少々お待ちください</p>
            </div>
        `;
        
        const data = await fetchApi('/api/servers');
        if (data.ok) {
            currentServers = data.servers || [];
            
            // 短い遅延を追加してスムーズな体験を提供
            setTimeout(() => {
                renderServersList();
            }, 300);
        } else {
            showError('サーバー一覧の取得に失敗しました。');
            serversListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                    <h3>エラーが発生しました</h3>
                    <p>サーバー一覧を取得できませんでした</p>
                    <button class="btn btn-primary" onclick="loadServers()">
                        <i class="fas fa-redo"></i>
                        再試行
                    </button>
                </div>
            `;
        }
    } catch (error) {
        showError('サーバー一覧の取得中にエラーが発生しました。');
        serversListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-wifi" style="color: #ef4444;"></i>
                <h3>接続エラー</h3>
                <p>ネットワーク接続を確認してください</p>
                <button class="btn btn-primary" onclick="loadServers()">
                    <i class="fas fa-redo"></i>
                    再試行
                </button>
            </div>
        `;
    }
}

async function createServer(serverData) {
    try {
        const data = await fetchApi('/api/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverData),
        });
        if (data.ok) {
            showSuccess(`🎉 "${serverData.serverName}" が正常に作成されました！`);
            resetForm();
            await loadServers();
            
            // 少し遅延してからサーバー一覧タブに切り替え
            setTimeout(() => {
                switchTab('servers');
            }, 1500);
        } else {
            showError(data.message || 'サーバーの作成に失敗しました。');
            // ボタンを元に戻す
            const originalText = '<i class="fas fa-rocket"></i><span id="form-submit-text">サーバーを作成</span>';
            formSubmitButton.innerHTML = originalText;
            formSubmitButton.disabled = false;
        }
    } catch (error) {
        showError('サーバー作成中にエラーが発生しました。');
        // ボタンを元に戻す
        const originalText = '<i class="fas fa-rocket"></i><span id="form-submit-text">サーバーを作成</span>';
        formSubmitButton.innerHTML = originalText;
        formSubmitButton.disabled = false;
    }
}

async function updateServer(serverId, serverData) {
    try {
        const data = await fetchApi(`/api/servers/${serverId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverData),
        });
        if (data.ok) {
            showSuccess(`✅ "${serverData.serverName}" の設定を更新しました！`);
            resetForm();
            await loadServers();
            
            // 少し遅延してからサーバー一覧タブに切り替え
            setTimeout(() => {
                switchTab('servers');
            }, 1500);
        } else {
            showError(data.message || 'サーバーの更新に失敗しました。');
            // ボタンを元に戻す
            const originalText = '<i class="fas fa-save"></i><span id="form-submit-text">サーバーを更新</span>';
            formSubmitButton.innerHTML = originalText;
            formSubmitButton.disabled = false;
        }
    } catch (error) {
        showError('サーバー更新中にエラーが発生しました。');
        // ボタンを元に戻す
        const originalText = '<i class="fas fa-save"></i><span id="form-submit-text">サーバーを更新</span>';
        formSubmitButton.innerHTML = originalText;
        formSubmitButton.disabled = false;
    }
}

async function deleteServer(serverId) {
    const server = currentServers.find(s => s.id === serverId);
    if (!server) {
        showError('削除するサーバーが見つかりませんでした。');
        return;
    }
    
    // 確認ダイアログをより詳細に
    const confirmMessage = `本当に "${server.serverName}" を削除しますか？\n\nこの操作は取り消せません。\n- サーバー名: ${server.serverName}\n- バージョン: ${server.minecraftVersion}\n- ソフトウェア: ${server.serverSoftware}`;
    
    if (!confirm(confirmMessage)) return;
    
    // 削除ボタンの状態更新
    const deleteBtn = document.querySelector(`[onclick="deleteServer('${serverId}')"]`);
    if (deleteBtn) {
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 削除中...';
        deleteBtn.disabled = true;
    }
    
    try {
        const data = await fetchApi(`/api/servers/${serverId}`, { method: 'DELETE' });
        if (data.ok) {
            showSuccess(`🗑️ "${server.serverName}" を削除しました。`);
            
            // サーバーカードをフェードアウト
            const serverCard = document.querySelector(`[data-server-id="${serverId}"]`);
            if (serverCard) {
                serverCard.style.transition = 'all 0.3s ease';
                serverCard.style.opacity = '0';
                serverCard.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    loadServers();
                }, 300);
            } else {
                await loadServers();
            }
        } else {
            showError(data.message || 'サーバーの削除に失敗しました。');
            // ボタンを元に戻す
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> 削除';
                deleteBtn.disabled = false;
            }
        }
    } catch (error) {
        showError('サーバー削除中にエラーが発生しました。');
        // ボタンを元に戻す
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i> 削除';
            deleteBtn.disabled = false;
        }
    }
}

// --- UIレンダリング ---

function renderServersList() {
    if (currentServers.length === 0) {
        serversListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-server"></i>
                <h3>サーバーが登録されていません</h3>
                <p>「新規作成」タブから最初のMinecraftサーバーを追加してください。</p>
                <button class="btn btn-primary" onclick="switchTab('create')">
                    <i class="fas fa-plus-circle"></i>
                    サーバーを作成する
                </button>
            </div>
        `;
        return;
    }

    serversListEl.innerHTML = `
        <div class="servers-grid">
            ${currentServers.map(server => {
                const statusClass = server.isRunning ? 'running' : 'stopped';
                const statusText = server.isRunning ? '🟢 稼働中' : '🔴 停止中';
                const createdDate = new Date(server.createdAt).toLocaleDateString('ja-JP');
                
                return `
                    <div class="server-card" data-server-id="${server.id}">
                        <div class="server-status ${statusClass}">${statusText}</div>
                        
                        <div class="server-name">
                            <i class="fas fa-cube" style="color: #667eea; margin-right: 8px;"></i>
                            ${escapeHtml(server.serverName)}
                        </div>
                        
                        <div class="server-details">
                            <div class="server-detail">
                                <span class="server-detail-label">
                                    <i class="fas fa-code-branch"></i> バージョン
                                </span>
                                <span class="server-detail-value">${escapeHtml(server.minecraftVersion)}</span>
                            </div>
                            <div class="server-detail">
                                <span class="server-detail-label">
                                    <i class="fas fa-cogs"></i> ソフトウェア
                                </span>
                                <span class="server-detail-value">${escapeHtml(server.serverSoftware)}</span>
                            </div>
                            <div class="server-detail">
                                <span class="server-detail-label">
                                    <i class="fas fa-coffee"></i> JDK
                                </span>
                                <span class="server-detail-value">${escapeHtml(server.jdkVersion)}</span>
                            </div>
                            <div class="server-detail">
                                <span class="server-detail-label">
                                    <i class="fas fa-calendar-alt"></i> 作成日
                                </span>
                                <span class="server-detail-value">${createdDate}</span>
                            </div>
                        </div>
                        
                        <div class="server-actions">
                            <button class="btn btn-secondary btn-sm" onclick="prepareEditForm('${server.id}')" title="サーバー設定を編集">
                                <i class="fas fa-edit"></i>
                                編集
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteServer('${server.id}')" title="サーバーを削除">
                                <i class="fas fa-trash-alt"></i>
                                削除
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // アニメーション効果を追加
    setTimeout(() => {
        document.querySelectorAll('.server-card').forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }, 50);
}

// --- フォームとタブの操作 ---

function switchTab(tabName) {
    // タブボタンの状態更新
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));

    // 新しいタブをアクティブに
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    const activeSection = document.getElementById(`${tabName}-tab`);
    
    if (activeButton && activeSection) {
        activeButton.classList.add('active');
        activeSection.classList.add('active');
        
        // アニメーション効果
        activeSection.style.opacity = '0';
        activeSection.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            activeSection.style.transition = 'all 0.3s ease';
            activeSection.style.opacity = '1';
            activeSection.style.transform = 'translateY(0)';
        }, 50);
    }
}

function resetForm() {
    serverForm.reset();
    serverIdInput.value = '';
    
    // フォームタイトルとボタンテキストを更新
    const titleElement = document.querySelector('#form-title');
    const submitTextElement = document.getElementById('form-submit-text');
    const submitIconElement = formSubmitButton.querySelector('i');
    
    if (titleElement) titleElement.textContent = '新しいMinecraftサーバーを作成';
    if (submitTextElement) submitTextElement.textContent = 'サーバーを作成';
    if (submitIconElement) submitIconElement.className = 'fas fa-rocket';
    
    // フォームをリセット状態に
    formSubmitButton.disabled = false;
    formSubmitButton.className = 'btn btn-primary';
}

function prepareEditForm(serverId) {
    const server = currentServers.find(s => s.id === serverId);
    if (!server) {
        showError('サーバー情報が見つかりませんでした。');
        return;
    }

    resetForm();

    // フォームに既存データを入力
    serverIdInput.value = server.id;
    document.getElementById('serverName').value = server.serverName;
    document.getElementById('minecraftVersion').value = server.minecraftVersion;
    document.getElementById('serverSoftware').value = server.serverSoftware;
    document.getElementById('jdkVersion').value = server.jdkVersion;

    // フォームタイトルとボタンを編集モードに変更
    const titleElement = document.querySelector('#form-title');
    const submitTextElement = document.getElementById('form-submit-text');
    const submitIconElement = formSubmitButton.querySelector('i');
    
    if (titleElement) titleElement.textContent = `"${server.serverName}" を編集`;
    if (submitTextElement) submitTextElement.textContent = 'サーバーを更新';
    if (submitIconElement) submitIconElement.className = 'fas fa-save';
    
    formSubmitButton.className = 'btn btn-secondary';

    switchTab('create');
    
    // 編集フォーム表示の成功メッセージ
    showSuccess(`${server.serverName} の編集モードに切り替えました。`);
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    // UI フィードバック
    const originalText = formSubmitButton.innerHTML;
    const isEditing = !!serverIdInput.value;
    
    formSubmitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEditing ? '更新中...' : '作成中...'}`;
    formSubmitButton.disabled = true;
    
    // フォームデータの取得と検証
    const formData = new FormData(serverForm);
    const serverData = {
        serverName: formData.get('serverName')?.trim(),
        minecraftVersion: formData.get('minecraftVersion'),
        serverSoftware: formData.get('serverSoftware'),
        jdkVersion: formData.get('jdkVersion'),
    };
    
    // バリデーション
    const errors = [];
    if (!serverData.serverName) errors.push('サーバー名を入力してください。');
    if (!serverData.minecraftVersion) errors.push('Minecraftバージョンを選択してください。');
    if (!serverData.serverSoftware) errors.push('サーバーソフトウェアを選択してください。');
    if (!serverData.jdkVersion) errors.push('JDKバージョンを選択してください。');
    
    if (errors.length > 0) {
        showError(errors.join('\n'));
        formSubmitButton.innerHTML = originalText;
        formSubmitButton.disabled = false;
        return;
    }

    const serverId = formData.get('serverId');
    
    try {
        if (serverId) {
            updateServer(serverId, serverData);
        } else {
            createServer(serverData);
        }
    } catch (error) {
        formSubmitButton.innerHTML = originalText;
        formSubmitButton.disabled = false;
        showError('処理中にエラーが発生しました。');
    }
}

// --- 初期化 ---

function initializeApp() {
    console.log('Minecraft App Initialized');
    loadServers();
    connectDownloadWebSocket();

    // イベントリスナーを一度だけ設定
    if (!window.appInitialized) {
        // タブ切り替え
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                if (tabName === 'create') {
                    // 「新規作成」タブがクリックされたら、常にフォームをリセットする
                    const currentServerId = serverIdInput.value;
                    if (currentServerId) {
                        resetForm();
                    }
                }
                switchTab(tabName);
            });
        });

        // フォーム送信
        serverForm.addEventListener('submit', handleFormSubmit);

        // ↓↓↓ ADD ALL OF THIS ↓↓↓
        // Download Manager Event Listeners
        const fetchListBtn = document.getElementById('fetchDownloadListBtn');
        if (fetchListBtn) {
            fetchListBtn.addEventListener('click', fetchDownloadList);
        }

        const startDownloadBtn = document.getElementById('startDownloadBtn');
        if (startDownloadBtn) {
            startDownloadBtn.addEventListener('click', startFileDownload);
        }

        const activeDownloadsList = document.getElementById('activeDownloadsList');
        if (activeDownloadsList) {
            activeDownloadsList.addEventListener('click', (event) => {
                if (event.target.classList.contains('cancel-download-btn') || 
                    event.target.closest('.cancel-download-btn')) {
                    const btn = event.target.classList.contains('cancel-download-btn') 
                        ? event.target 
                        : event.target.closest('.cancel-download-btn');
                    const taskId = btn.dataset.taskId;
                    if (taskId) {
                        cancelFileDownload(taskId);
                    }
                }
            });
        }
        // ↑↑↑ END OF NEW CODE ↑↑↑

        window.appInitialized = true;
    }
}

// グローバルスコープに関数を公開して、HTMLのonclickから呼び出せるようにする
window.prepareEditForm = prepareEditForm;
window.deleteServer = deleteServer;
window.switchTab = switchTab;
window.loadServers = loadServers;
window.fetchDownloadList = fetchDownloadList;        // ← ADD
window.startFileDownload = startFileDownload;        // ← ADD
window.cancelFileDownload = cancelFileDownload;      // ← ADD

// デバッグ用（開発環境のみ）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugApp = {
        currentServers,
        showError,
        showSuccess,
        renderServersList,
        resetForm,
        downloadWs,           // ← ADD
        activeDownloads,      // ← ADD
        currentListData,      // ← ADD
        selectedFile          // ← ADD
    };
}

// 初期化実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}