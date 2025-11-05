// ========================================
// Configuration
// ========================================
// プロトコルを動的に判定（HTTPSの場合はWSSを使用）
const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const API_BASE = `${protocol}//${window.location.host}/api/assets`;
const WS_URL = `${wsProtocol}//${window.location.host}/ws`;

console.log('🔗 API Base:', API_BASE);
console.log('🔗 WebSocket URL:', WS_URL);

// ========================================
// State Management
// ========================================
let ws = null;
let currentListData = null;
let selectedFile = null;
let activeDownloads = new Map();

// ========================================
// DOM Elements
// ========================================
const elements = {
  connectionStatus: document.getElementById('connectionStatus'),
  listType: document.getElementById('listType'),
  fetchListBtn: document.getElementById('fetchListBtn'),
  listPreview: document.getElementById('listPreview'),
  versionSelector: document.getElementById('versionSelector'),
  versionButtons: document.getElementById('versionButtons'),
  selectedFileInfo: document.getElementById('selectedFileInfo'),
  selectedFileName: document.getElementById('selectedFileName'),
  selectedFileUrl: document.getElementById('selectedFileUrl'),
  downloadBtn: document.getElementById('downloadBtn'),
  downloadsList: document.getElementById('downloadsList'),
};

// ========================================
// WebSocket Connection
// ========================================
function connectWebSocket() {
  // デバッグ: 現在のCookieを確認
  console.log('🍪 Current cookies:', document.cookie);
  console.log('🔗 Connecting to WebSocket:', WS_URL);

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('✅ WebSocket connected');
    updateConnectionStatus(true);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  ws.onclose = (event) => {
    console.log('❌ WebSocket disconnected');
    console.log('Close code:', event.code, 'Reason:', event.reason);
    updateConnectionStatus(false);

    // 認証エラー(1008)の場合は特別な処理
    if (event.code === 1008) {
      console.error('🔒 Authentication failed - Please login');
      // ユーザーに通知（必要に応じてUIで表示）
      alert('WebSocket接続の認証に失敗しました。ページを更新してログインしてください。');
      return; // 再接続しない
    }

    // セッションエラー(1011)の場合
    if (event.code === 1011) {
      console.error('⚠️ Session processing failed');
      alert('セッション処理中にエラーが発生しました。ページを更新してください。');
      return; // 再接続しない
    }

    // その他の切断の場合は再接続を試みる
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

function handleWebSocketMessage(message) {
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
      // Keep-alive messages
      break;
    default:
      console.log('Unknown message type:', message.type);
  }
}

function updateConnectionStatus(connected) {
  if (connected) {
    elements.connectionStatus.className = 'connection-status connected';
    elements.connectionStatus.textContent = '✅ Connected';
  } else {
    elements.connectionStatus.className = 'connection-status disconnected';
    elements.connectionStatus.textContent = '⚠️ Disconnected';
  }
}

// ========================================
// List Fetching
// ========================================
async function fetchList() {
  const type = elements.listType.value;

  if (!type) {
    alert('Please select a list type');
    return;
  }

  elements.fetchListBtn.disabled = true;
  elements.fetchListBtn.textContent = 'Loading...';

  try {
    const response = await fetch(`${API_BASE}/list/${type}`);
    const data = await response.json();

    if (data.success) {
      currentListData = data.data;
      displayListPreview(data.data);
      displayVersionSelector(data.data, type);
    } else {
      alert(`Error: ${data.error.message}`);
    }
  } catch (error) {
    console.error('Failed to fetch list:', error);
    alert('Failed to fetch list from server');
  } finally {
    elements.fetchListBtn.disabled = false;
    elements.fetchListBtn.textContent = 'Fetch List';
  }
}

function displayListPreview(data) {
  elements.listPreview.style.display = 'block';
  elements.listPreview.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

function displayVersionSelector(data, type) {
  elements.versionSelector.style.display = 'block';
  elements.versionButtons.innerHTML = '';

  if (type === 'servers') {
    // Display server types and versions
    data.forEach(server => {
      const serverSection = document.createElement('div');
      serverSection.style.gridColumn = '1 / -1';
      serverSection.style.marginTop = '15px';

      const serverTitle = document.createElement('h4');
      serverTitle.textContent = server.name;
      serverTitle.style.marginBottom = '10px';
      serverTitle.style.color = '#667eea';
      serverSection.appendChild(serverTitle);

      const versionGrid = document.createElement('div');
      versionGrid.className = 'version-selector';

      server.versions.forEach(version => {
        const btn = createVersionButton(
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
      elements.versionButtons.appendChild(serverSection);
    });
  } else if (type === 'jdk') {
    // Display JDK versions and OS options
    data.forEach(jdk => {
      const jdkSection = document.createElement('div');
      jdkSection.style.gridColumn = '1 / -1';
      jdkSection.style.marginTop = '15px';

      const jdkTitle = document.createElement('h4');
      jdkTitle.textContent = `JDK ${jdk.version} ${jdk.vendor ? `(${jdk.vendor})` : ''}`;
      jdkTitle.style.marginBottom = '10px';
      jdkTitle.style.color = '#667eea';
      jdkSection.appendChild(jdkTitle);

      const osGrid = document.createElement('div');
      osGrid.className = 'version-selector';

      jdk.downloads.forEach(download => {
        const btn = createVersionButton(
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
      elements.versionButtons.appendChild(jdkSection);
    });
  }
}

function createVersionButton(label, fileInfo) {
  const btn = document.createElement('div');
  btn.className = 'version-button';
  btn.textContent = label;
  btn.onclick = () => selectFile(btn, fileInfo);
  return btn;
}

function selectFile(button, fileInfo) {
  // Remove previous selection
  document.querySelectorAll('.version-button').forEach(btn => {
    btn.classList.remove('selected');
  });

  // Mark as selected
  button.classList.add('selected');
  selectedFile = fileInfo;

  // Display selected file info
  elements.selectedFileInfo.style.display = 'block';

  if (fileInfo.type === 'server') {
    elements.selectedFileName.textContent = `${fileInfo.name} ${fileInfo.version} (JDK ${fileInfo.jdk})`;
  } else if (fileInfo.type === 'jdk') {
    elements.selectedFileName.textContent = `JDK ${fileInfo.version} - ${fileInfo.os.toUpperCase()}`;
  }

  elements.selectedFileUrl.textContent = fileInfo.url;
}

// ========================================
// Download Management
// ========================================
async function startDownload() {
  if (!selectedFile) {
    alert('Please select a file first');
    return;
  }

  elements.downloadBtn.disabled = true;
  elements.downloadBtn.textContent = 'Starting...';

  try {
    const response = await fetch(`${API_BASE}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: selectedFile.url,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('Download started:', data.data);
      addDownloadItem(data.data.taskId, data.data.status);
    } else {
      alert(`Error: ${data.error.message}`);
    }
  } catch (error) {
    console.error('Failed to start download:', error);
    alert('Failed to start download');
  } finally {
    elements.downloadBtn.disabled = false;
    elements.downloadBtn.textContent = 'Start Download';
  }
}

function addDownloadItem(taskId, status) {
  if (activeDownloads.has(taskId)) {
    return; // Already exists
  }

  // Remove empty state if exists
  const emptyState = elements.downloadsList.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  const item = document.createElement('div');
  item.className = 'download-item';
  item.id = `download-${taskId}`;
  item.innerHTML = `
    <div class="download-header">
      <div class="download-filename">${status.filename}</div>
      <div class="download-status status-${status.status}">${status.status.toUpperCase()}</div>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: ${status.percentage}%">
        ${status.percentage.toFixed(1)}%
      </div>
    </div>
    <div class="download-info">
      <span>Downloaded: <strong id="downloaded-${taskId}">0 MB</strong> / <strong id="total-${taskId}">0 MB</strong></span>
      <span>Speed: <strong id="speed-${taskId}">0 KB/s</strong></span>
      <span>Remaining: <strong id="remaining-${taskId}">--</strong></span>
    </div>
  `;

  elements.downloadsList.prepend(item);
  activeDownloads.set(taskId, item);

  updateDownloadProgress(status);
}

function updateDownloadProgress(progress) {
  const item = activeDownloads.get(progress.taskId);
  if (!item) {
    addDownloadItem(progress.taskId, progress);
    return;
  }

  // Update progress bar
  const progressBar = item.querySelector('.progress-bar');
  progressBar.style.width = `${progress.percentage}%`;
  progressBar.textContent = `${progress.percentage.toFixed(1)}%`;

  // Update status
  const statusBadge = item.querySelector('.download-status');
  statusBadge.className = `download-status status-${progress.status}`;
  statusBadge.textContent = progress.status.toUpperCase();

  // Update info
  const downloadedMB = (progress.downloadedBytes / (1024 * 1024)).toFixed(2);
  const totalMB = (progress.totalBytes / (1024 * 1024)).toFixed(2);
  const speedKB = (progress.speed / 1024).toFixed(2);
  const remainingMin = Math.floor(progress.remainingTime / 60);
  const remainingSec = Math.floor(progress.remainingTime % 60);

  document.getElementById(`downloaded-${progress.taskId}`).textContent = `${downloadedMB} MB`;
  document.getElementById(`total-${progress.taskId}`).textContent = `${totalMB} MB`;
  document.getElementById(`speed-${progress.taskId}`).textContent = `${speedKB} KB/s`;
  document.getElementById(`remaining-${progress.taskId}`).textContent =
    progress.remainingTime > 0 ? `${remainingMin}m ${remainingSec}s` : '--';
}

function handleDownloadComplete(data) {
  console.log('✅ Download completed:', data);

  // Update status badge
  const item = activeDownloads.get(data.taskId);
  if (item) {
    const statusBadge = item.querySelector('.download-status');
    statusBadge.className = 'download-status status-completed';
    statusBadge.textContent = 'COMPLETED';
  }
}

function handleDownloadError(data) {
  console.error('❌ Download error:', data);

  const item = activeDownloads.get(data.taskId);
  if (item) {
    const statusBadge = item.querySelector('.download-status');
    statusBadge.className = 'download-status status-error';
    statusBadge.textContent = 'ERROR';

    // エラーメッセージを表示
    const errorContainer = document.createElement('div');
    errorContainer.className = 'download-error-message';
    errorContainer.textContent = data.error || 'An unknown error occurred.';
    errorContainer.style.display = 'block';
    item.appendChild(errorContainer);
  }
}

// ========================================
// Event Listeners
// ========================================
elements.fetchListBtn.addEventListener('click', fetchList);
elements.downloadBtn.addEventListener('click', startDownload);

// ========================================
// Initialize
// ========================================
connectWebSocket();
console.log('🚀 Frontend initialized');
