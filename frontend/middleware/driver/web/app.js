// サーバー管理アプリケーション

let currentServers = [];

// タブ切り替え
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    });
});

// サーバー一覧読み込み
window.loadServers = async function () {
    try {
        const response = await fetch('/api/servers', { credentials: 'include' });
        const data = await response.json();

        if (data.ok) {
            currentServers = data.servers;
            renderServers(data.servers);
        } else {
            showError('サーバー一覧の取得に失敗しました');
        }
    } catch (error) {
        console.error('サーバー取得エラー:', error);
        showError('サーバー一覧の取得中にエラーが発生しました');
    }
};

// サーバー一覧表示
function renderServers(servers) {
    const container = document.getElementById('serversList');

    if (servers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-server"></i>
                <h3>サーバーがありません</h3>
                <p>「新規作成」タブから最初のサーバーを作成しましょう</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `<div class="servers-grid">${servers.map(server => `
        <div class="server-card">
            <div class="server-status ${server.isRunning ? 'running' : 'stopped'}">
                ${server.isRunning ? 'Running' : 'Stopped'}
            </div>
            <div class="server-name">${escapeHtml(server.serverName)}</div>
            <div class="server-details">
                <div class="server-detail">
                    <span class="server-detail-label">バージョン</span>
                    <span class="server-detail-value">${escapeHtml(server.minecraftVersion)}</span>
                </div>
                <div class="server-detail">
                    <span class="server-detail-label">ソフトウェア</span>
                    <span class="server-detail-value">${escapeHtml(server.serverSoftware)}</span>
                </div>
                <div class="server-detail">
                    <span class="server-detail-label">JDK</span>
                    <span class="server-detail-value">${escapeHtml(server.jdkVersion)}</span>
                </div>
            </div>
            <div class="server-actions">
                ${server.isRunning ? `
                    <button class="btn btn-danger btn-sm" onclick="stopServer('${server.id}')">
                        <i class="fas fa-stop"></i> 停止
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="showConsole('${server.id}')">
                        <i class="fas fa-terminal"></i> コンソール
                    </button>
                ` : `
                    <button class="btn btn-success btn-sm" onclick="startServer('${server.id}')">
                        <i class="fas fa-play"></i> 起動
                    </button>
                `}
                <button class="btn btn-secondary btn-sm" onclick="deleteServer('${server.id}')">
                    <i class="fas fa-trash"></i> 削除
                </button>
            </div>
        </div>
    `).join('')}</div>`;
}

// サーバー作成フォーム送信
document.getElementById('serverForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        serverName: formData.get('serverName'),
        minecraftVersion: formData.get('minecraftVersion'),
        serverSoftware: formData.get('serverSoftware'),
        serverFilePath: formData.get('serverFilePath'),
        connectTo: 'local',
        autoJdk: 'now' // JDK自動ダウンロード
    };

    try {
        const response = await fetch('/api/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.ok) {
            showSuccess('サーバーを作成しました！');
            e.target.reset();
            loadServers();

            // 作成ジョブがあればメッセージ表示
            if (result.jobs && result.jobs.length > 0) {
                showSuccess(`JDKダウンロードジョブを開始しました (Job ID: ${result.jobs[0].id})`);
            }
        } else {
            showError(result.message || 'サーバーの作成に失敗しました');
        }
    } catch (error) {
        console.error('サーバー作成エラー:', error);
        showError('サーバー作成中にエラーが発生しました');
    }
});

// サーバー起動
window.startServer = async function (serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}/start`, {
            method: 'POST',
            credentials: 'include'
        });
        const result = await response.json();

        if (result.ok) {
            showSuccess('サーバーを起動しました');
            loadServers();
        } else {
            showError(result.message || 'サーバーの起動に失敗しました');
        }
    } catch (error) {
        console.error('起動エラー:', error);
        showError('サーバー起動中にエラーが発生しました');
    }
};

// サーバー停止
window.stopServer = async function (serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}/stop`, {
            method: 'POST',
            credentials: 'include'
        });
        const result = await response.json();

        if (result.ok) {
            showSuccess('サーバーを停止しました');
            loadServers();
        } else {
            showError(result.message || 'サーバーの停止に失敗しました');
        }
    } catch (error) {
        console.error('停止エラー:', error);
        showError('サーバー停止中にエラーが発生しました');
    }
};

// サーバー削除
window.deleteServer = async function (serverId) {
    if (!confirm('本当にこのサーバーを削除しますか？')) return;

    try {
        const response = await fetch(`/api/servers/${serverId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();

        if (result.ok) {
            showSuccess('サーバーを削除しました');
            loadServers();
        } else {
            showError(result.message || 'サーバーの削除に失敗しました');
        }
    } catch (error) {
        console.error('削除エラー:', error);
        showError('サーバー削除中にエラーが発生しました');
    }
};

// コンソール表示（簡易実装）
window.showConsole = function (serverId) {
    alert(`サーバー ${serverId} のコンソールを表示します（WebSocket実装予定）`);
};

// 保護されたAPIテスト
document.getElementById('test-protected-api')?.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/protected', { credentials: 'include' });
        const data = await response.json();
        document.getElementById('api-response').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        document.getElementById('api-response').textContent = `エラー: ${error.message}`;
    }
});

// メッセージ表示ヘルパー
function showError(message) {
    const el = document.getElementById('errorMessage');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
}

function showSuccess(message) {
    const el = document.getElementById('successMessage');
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}