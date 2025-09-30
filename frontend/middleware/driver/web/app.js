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
function showMessage(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}
const showError = (message) => showMessage(errorMessageEl, message);
const showSuccess = (message) => showMessage(successMessageEl, message);

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
        const data = await fetchApi('/api/servers');
        if (data.ok) {
            currentServers = data.servers || [];
            renderServersList();
        } else {
            showError('サーバー一覧の取得に失敗しました。');
        }
    } catch (error) {
        showError('サーバー一覧の取得中にエラーが発生しました。');
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
            showSuccess('サーバーが作成されました。');
            resetForm();
            await loadServers();
            switchTab('servers');
        } else {
            showError(data.message || 'サーバーの作成に失敗しました。');
        }
    } catch (error) {
        showError('サーバー作成中にエラーが発生しました。');
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
            showSuccess('サーバーが更新されました。');
            resetForm();
            await loadServers();
            switchTab('servers');
        } else {
            showError(data.message || 'サーバーの更新に失敗しました。');
        }
    } catch (error) {
        showError('サーバー更新中にエラーが発生しました。');
    }
}

async function deleteServer(serverId) {
    if (!confirm('本当にこのサーバーを削除しますか？')) return;
    try {
        const data = await fetchApi(`/api/servers/${serverId}`, { method: 'DELETE' });
        if (data.ok) {
            showSuccess('サーバーが削除されました。');
            await loadServers();
        } else {
            showError(data.message || 'サーバーの削除に失敗しました。');
        }
    } catch (error) {
        showError('サーバー削除中にエラーが発生しました。');
    }
}

// --- UIレンダリング ---

function renderServersList() {
    if (currentServers.length === 0) {
        serversListEl.innerHTML = '<p>サーバーはまだ登録されていません。「新規作成」タブから追加してください。</p>';
        return;
    }

    serversListEl.innerHTML = currentServers.map(server => {
        const statusClass = server.isRunning ? 'running' : 'stopped';
        const statusText = server.isRunning ? '稼働中' : '停止中';
        return `
            <div class="server-card" data-server-id="${server.id}">
                <div class="server-header">
                    <div class="server-name">${escapeHtml(server.serverName)}</div>
                    <div class="server-status ${statusClass}">${statusText}</div>
                </div>
                <div class="server-details">
                    <div><strong>バージョン:</strong> ${escapeHtml(server.minecraftVersion)}</div>
                    <div><strong>ソフトウェア:</strong> ${escapeHtml(server.serverSoftware)}</div>
                    <div><strong>JDK:</strong> ${escapeHtml(server.jdkVersion)}</div>
                </div>
                <div class="server-actions">
                    <button class="btn-edit" onclick="prepareEditForm('${server.id}')">編集</button>
                    <button class="btn-delete" onclick="deleteServer('${server.id}')">削除</button>
                </div>
            </div>
        `;
    }).join('');
}

// --- フォームとタブの操作 ---

function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.minecraft-section').forEach(section => section.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function resetForm() {
    serverForm.reset();
    serverIdInput.value = '';
    formTitle.textContent = '新しいMinecraftサーバーを作成';
    formSubmitButton.textContent = 'サーバーを作成';
}

function prepareEditForm(serverId) {
    const server = currentServers.find(s => s.id === serverId);
    if (!server) return;

    resetForm();

    serverIdInput.value = server.id;
    document.getElementById('serverName').value = server.serverName;
    document.getElementById('minecraftVersion').value = server.minecraftVersion;
    document.getElementById('serverSoftware').value = server.serverSoftware;
    document.getElementById('jdkVersion').value = server.jdkVersion;

    formTitle.textContent = 'サーバー情報を編集';
    formSubmitButton.textContent = 'サーバーを更新';

    switchTab('create');
}

function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(serverForm);
    const serverData = {
        serverName: formData.get('serverName'),
        minecraftVersion: formData.get('minecraftVersion'),
        serverSoftware: formData.get('serverSoftware'),
        jdkVersion: formData.get('jdkVersion'),
    };

    const serverId = formData.get('serverId');
    if (serverId) {
        updateServer(serverId, serverData);
    } else {
        createServer(serverData);
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