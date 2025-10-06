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

        window.appInitialized = true;
    }
}

// グローバルスコープに関数を公開して、HTMLのonclickから呼び出せるようにする
window.prepareEditForm = prepareEditForm;
window.deleteServer = deleteServer;
window.switchTab = switchTab;
window.loadServers = loadServers;

// デバッグ用（開発環境のみ）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debugApp = {
        currentServers,
        showError,
        showSuccess,
        renderServersList,
        resetForm
    };
}