// サーバー管理アプリケーション
let currentServers = [];
let availableResources = {
    jdks: [],
    servers: []
};

// 初期化時にアセットサーバーからリソース情報を取得（プロキシ経由）
async function loadAvailableResources() {
    try {
        // JDKリストを取得（認証付きプロキシ経由）
        const jdkResponse = await fetch('/api/assets/resources?type=jdk', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!jdkResponse.ok) {
            if (jdkResponse.status === 401) {
                console.error('Unauthorized access to assets');
                return;
            }
            throw new Error(`HTTP ${jdkResponse.status}`);
        }

        const jdkData = await jdkResponse.json();

        // サーバーソフトウェアリストを取得（認証付きプロキシ経由）
        const serverResponse = await fetch('/api/assets/resources?type=server', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!serverResponse.ok) {
            throw new Error(`HTTP ${serverResponse.status}`);
        }

        const serverData = await serverResponse.json();

        if (jdkData.ok && serverData.ok) {
            availableResources.jdks = jdkData.resources || [];
            availableResources.servers = serverData.resources || [];

            // フォームのセレクトボックスを更新
            updateFormSelects();
            console.log('Available resources loaded:', {
                jdks: availableResources.jdks.length,
                servers: availableResources.servers.length,
                requestedBy: jdkData.requestedBy
            });
        } else {
            console.warn('Failed to load resources:', jdkData, serverData);
        }
    } catch (error) {
        console.error('Failed to load available resources:', error);
        showError('リソース情報の取得に失敗しました。アセットサーバーが起動していることを確認してください。');
    }
}

// フォームのセレクトボックスを動的に更新
function updateFormSelects() {
    // JDKセレクトボックスを更新
    const jdkSelect = document.getElementById('jdkVersion');
    if (jdkSelect && availableResources.jdks.length > 0) {
        const currentValue = jdkSelect.value;
        jdkSelect.innerHTML = '<option value="">JDKを選択してください（推奨は自動選択されます）</option>';

        availableResources.jdks.forEach(jdk => {
            const option = document.createElement('option');
            option.value = jdk.version;
            option.textContent = `${jdk.name}`;
            option.dataset.jdkId = jdk.id;
            option.dataset.size = jdk.size;
            jdkSelect.appendChild(option);
        });

        // 以前の選択を復元
        if (currentValue) {
            jdkSelect.value = currentValue;
        }
    } else if (jdkSelect && availableResources.jdks.length === 0) {
        jdkSelect.innerHTML = '<option value="">JDKリソースが見つかりません</option>';
    }
}

// Minecraftバージョンが変更されたときの処理
async function onMinecraftVersionChange() {
    const minecraftVersion = document.getElementById('minecraftVersion').value;
    if (!minecraftVersion) return;

    // 推奨JDKをチェック
    await checkRecommendedJDK(minecraftVersion);

    // サーバーソフトウェアオプションを更新
    updateServerSoftwareOptions(minecraftVersion);
}

// 推奨JDKのチェックと自動選択
async function checkRecommendedJDK(minecraftVersion) {
    try {
        const response = await fetch('/api/jdks/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                minecraftVersion,
                serverSoftware: document.getElementById('serverSoftware').value || 'paper'
            })
        });

        const data = await response.json();
        if (data.ok) {
            const jdkSelect = document.getElementById('jdkVersion');
            const statusDiv = document.getElementById('jdk-status') || createJDKStatusDiv();

            // 推奨バージョンを表示
            const recommendedJDK = availableResources.jdks.find(j => j.version === data.recommended);
            const jdkName = recommendedJDK ? recommendedJDK.name : `JDK ${data.recommended}`;

            if (data.installed) {
                statusDiv.innerHTML = `
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            推奨: ${jdkName} (インストール済み)
          </div>
        `;
                // 推奨JDKを自動選択
                if (jdkSelect) jdkSelect.value = data.recommended;
            } else {
                const sizeInfo = recommendedJDK ? ` (${(recommendedJDK.size / 1024 / 1024).toFixed(1)} MB)` : '';
                statusDiv.innerHTML = `
          <div class="alert alert-warning">
            <i class="fas fa-download"></i>
            推奨: ${jdkName} (未インストール)${sizeInfo}
            <button class="btn btn-sm btn-primary ml-2" onclick="downloadJDK('${data.recommended}')">
              今すぐダウンロード
            </button>
          </div>
        `;
                // 推奨JDKを自動選択
                if (jdkSelect) jdkSelect.value = data.recommended;
            }
        }
    } catch (error) {
        console.error('JDK check error:', error);
        showError('JDKの確認中にエラーが発生しました');
    }
}

// JDKステータス表示用のDIVを作成
function createJDKStatusDiv() {
    const div = document.createElement('div');
    div.id = 'jdk-status';
    div.className = 'jdk-status-container';
    const jdkGroup = document.querySelector('#jdkVersion').closest('.form-group');
    if (jdkGroup) {
        jdkGroup.appendChild(div);
    }
    return div;
}

// JDKのダウンロード
async function downloadJDK(version) {
    try {
        showSuccess(`JDK ${version} のダウンロードを開始しています...`);

        const response = await fetch('/api/jdks/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ version })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.ok && data.job) {
            showSuccess(`JDK ${version} のダウンロードを開始しました (Job ID: ${data.job.id})`);

            // プログレスバーを表示
            if (window.progressBar) {
                window.progressBar.startTracking(data.job.id, `JDK ${version} ダウンロード`);
            }

            // ダウンロード完了を監視
            watchJobCompletion(data.job.id, () => {
                showSuccess(`JDK ${version} のインストールが完了しました`);
                const minecraftVersion = document.getElementById('minecraftVersion').value;
                if (minecraftVersion) {
                    checkRecommendedJDK(minecraftVersion);
                }
            });
        } else {
            throw new Error(data.message || 'ダウンロードの開始に失敗しました');
        }
    } catch (error) {
        console.error('JDK download error:', error);
        showError(`JDKのダウンロードに失敗しました: ${error.message}`);
    }
}

// ジョブの完了を監視
function watchJobCompletion(jobId, onComplete) {
    let checkCount = 0;
    const maxChecks = 300; // 最大5分間監視

    const checkInterval = setInterval(async () => {
        checkCount++;

        if (checkCount > maxChecks) {
            clearInterval(checkInterval);
            showError('ジョブの監視がタイムアウトしました');
            return;
        }

        try {
            const response = await fetch(`/api/jobs/${jobId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                clearInterval(checkInterval);
                showError('ジョブの状態確認に失敗しました');
                return;
            }

            const data = await response.json();

            if (data.ok && data.job) {
                if (data.job.status === 'success') {
                    clearInterval(checkInterval);
                    if (onComplete) onComplete();
                } else if (data.job.status === 'failed' || data.job.status === 'canceled') {
                    clearInterval(checkInterval);
                    showError(`ジョブが失敗しました: ${data.job.error?.message || '不明なエラー'}`);
                }
                // running/queuedの場合は継続
            }
        } catch (error) {
            console.error('Job check error:', error);
            // ネットワークエラーの場合は継続して監視
        }
    }, 1000);
}

// サーバーソフトウェアオプションの更新
function updateServerSoftwareOptions(minecraftVersion) {
    const serverSoftwareSelect = document.getElementById('serverSoftware');
    if (!serverSoftwareSelect) return;

    // バージョンに関係なく全てのサーバーソフトウェアを表示
    // （実際にはバージョン互換性のチェックが必要）
    const currentValue = serverSoftwareSelect.value;
    serverSoftwareSelect.innerHTML = '<option value="">サーバーソフトウェアを選択してください</option>';

    // 既知のサーバータイプ
    const serverTypes = [
        { value: 'vanilla', name: 'Vanilla (公式)', available: true },
        { value: 'paper', name: 'Paper (推奨)', available: true },
        { value: 'spigot', name: 'Spigot', available: true },
        { value: 'bukkit', name: 'Bukkit', available: true },
        { value: 'mohist', name: 'Mohist (Mod + Plugin)', available: true },
        { value: 'forge', name: 'Forge (Mod対応)', available: true },
        { value: 'fabric', name: 'Fabric (軽量Mod)', available: true }
    ];

    serverTypes.forEach(type => {
        // アセットサーバーに該当するリソースがあるかチェック
        const hasResource = availableResources.servers.some(s =>
            s.name.toLowerCase() === type.value
        );

        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.name + (hasResource ? '' : ' (リソース未登録)');
        option.disabled = !hasResource && type.value !== 'vanilla'; // Vanillaは外部DLなので常に有効
        serverSoftwareSelect.appendChild(option);
    });

    // 以前の選択を復元
    if (currentValue) {
        serverSoftwareSelect.value = currentValue;
    }
}

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
    if (!container) return;

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
    <div class="server-card" data-server-id="${server.id}">
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

    // JDKの自動ダウンロードオプション
    const autoJdk = document.getElementById('auto-download-jdk')?.checked ? 'now' : 'skip';

    const data = {
        serverName: formData.get('serverName'),
        minecraftVersion: formData.get('minecraftVersion'),
        serverSoftware: formData.get('serverSoftware'),
        serverFilePath: formData.get('serverFilePath'),
        jdkVersion: formData.get('jdkVersion'),
        connectTo: 'local',
        autoJdk: autoJdk
    };

    try {
        showSuccess('サーバーを作成しています...');

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

            // JDKダウンロードジョブがあれば表示
            if (result.jobs && result.jobs.length > 0) {
                result.jobs.forEach(job => {
                    if (job.type === 'jdk-download' && window.progressBar) {
                        window.progressBar.startTracking(job.id, `JDK ${job.payload.version} ダウンロード`);
                    }
                });
            }
        } else {
            showError(result.message || 'サーバーの作成に失敗しました');
        }
    } catch (error) {
        console.error('サーバー作成エラー:', error);
        showError('サーバー作成中にエラーが発生しました');
    }
});

// その他の関数は同じ...

// メッセージ表示ヘルパー
function showError(message) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    }
}

function showSuccess(message) {
    const el = document.getElementById('successMessage');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    }
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // プログレスバーを初期化
    if (window.ProgressBar) {
        window.progressBar = new ProgressBar('progress-container');
    }

    // 認証済みの場合のみリソースを読み込み
    if (document.getElementById('main-content')?.style.display !== 'none') {
        // アセットサーバーからリソース情報を取得
        loadAvailableResources();
    }

    // Minecraftバージョン変更イベントを設定
    const minecraftVersionSelect = document.getElementById('minecraftVersion');
    if (minecraftVersionSelect) {
        minecraftVersionSelect.addEventListener('change', onMinecraftVersionChange);
    }
});

// 認証成功後にリソースを読み込むためのフック
const originalShowMainContent = window.showMainContent;
window.showMainContent = function (userId) {
    if (originalShowMainContent) {
        originalShowMainContent(userId);
    }
    // 認証成功後にリソースを読み込み
    loadAvailableResources();
};
