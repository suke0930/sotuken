// Downloads Tab Template
export const downloadsTabTemplate = `
<div v-show="activeTab === 'downloads'" class="content-section active">
    <h2>
        <i class="fas fa-cloud-download-alt"></i>
        ダウンロード管理
    </h2>

    <div class="download-section">
        <h3><i class="fas fa-plug"></i> 接続状態</h3>
        <div :class="['connection-badge', wsConnected ? 'connected' : 'disconnected']">
            <i :class="wsConnected ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
            {{ wsConnected ? '接続済み' : '未接続' }}
        </div>
        <p style="color: var(--theme-text-secondary); font-size: 0.9rem; margin-top: 10px;">
            WebSocketサーバー (localhost:4000) への接続状態を表示しています。
        </p>
    </div>

    <div class="download-section">
        <h3><i class="fas fa-list"></i> リスト取得</h3>
        <div class="download-control-group">
            <label for="downloadListType">
                <i class="fas fa-filter"></i>
                リストタイプを選択:
            </label>
            <select id="downloadListType" v-model="downloadListType">
                <option value="">-- タイプを選択 --</option>
                <option value="servers">サーバーソフトウェア</option>
                <option value="jdk">JDK</option>
            </select>
        </div>
        <button @click="fetchDownloadList" class="btn btn-primary" :disabled="!downloadListType || fetchingList">
            <i :class="fetchingList ? 'fas fa-spinner fa-spin' : 'fas fa-download'"></i>
            {{ fetchingList ? '読み込み中...' : 'リストを取得' }}
        </button>

        <div v-if="downloadListData" class="download-list-preview">
            <pre>{{ JSON.stringify(downloadListData, null, 2) }}</pre>
        </div>
    </div>

    <div v-if="downloadListData" class="download-section">
        <h3><i class="fas fa-code-branch"></i> バージョン選択</h3>
        <div v-if="downloadListType === 'servers'">
            <div v-for="server in downloadListData" :key="server.name" style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px; color: var(--theme-primary);">{{ server.name }}</h4>
                <div class="download-version-grid">
                    <button
                        v-for="version in server.versions"
                        :key="version.version"
                        :class="['download-version-btn', { selected: selectedFile && selectedFile.url === version.downloadUrl }]"
                        @click="selectFile({ name: server.name, version: version.version, jdk: version.jdk, url: version.downloadUrl, type: 'server' })"
                    >
                        {{ version.version }} (JDK {{ version.jdk }})
                    </button>
                </div>
            </div>
        </div>
        <div v-else-if="downloadListType === 'jdk'">
            <div v-for="jdk in downloadListData" :key="jdk.version" style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px; color: var(--theme-primary);">JDK {{ jdk.version }} {{ jdk.vendor ? \`(\${jdk.vendor})\` : '' }}</h4>
                <div class="download-version-grid">
                    <button
                        v-for="download in jdk.downloads"
                        :key="download.os"
                        :class="['download-version-btn', { selected: selectedFile && selectedFile.url === download.downloadUrl }]"
                        @click="selectFile({ version: jdk.version, os: download.os, url: download.downloadUrl, vendor: jdk.vendor, type: 'jdk' })"
                    >
                        {{ download.os.toUpperCase() }}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div v-if="selectedFile" class="download-section">
        <h3><i class="fas fa-check-circle"></i> 選択されたファイル</h3>
        <div class="download-selected-file-card">
            <h4>ファイル情報:</h4>
            <p class="download-selected-file-name">
                <template v-if="selectedFile.type === 'server'">
                    {{ selectedFile.name }} {{ selectedFile.version }} (JDK {{ selectedFile.jdk }})
                </template>
                <template v-else>
                    JDK {{ selectedFile.version }} - {{ selectedFile.os.toUpperCase() }}
                </template>
            </p>
            <p class="download-selected-file-url">{{ selectedFile.url }}</p>
            <button @click="startDownload" class="btn btn-primary" style="margin-top: 15px;" :disabled="startingDownload">
                <i :class="startingDownload ? 'fas fa-spinner fa-spin' : 'fas fa-download'"></i>
                {{ startingDownload ? 'ダウンロード開始中...' : 'ダウンロード開始' }}
            </button>
        </div>
    </div>

    <div class="download-section">
        <h3><i class="fas fa-tasks"></i> アクティブなダウンロード</h3>
        <div v-if="activeDownloads.length === 0" class="empty-state">
            <i class="fas fa-inbox"></i>
            <h3>ダウンロードがありません</h3>
            <p>上記からファイルを選択してダウンロードを開始してください。</p>
        </div>
        <div v-else>
            <div v-for="download in activeDownloads" :key="download.taskId" class="download-card">
                <div class="download-card-header">
                    <div class="download-filename">
                        <i class="fas fa-file-download"></i>
                        {{ download.filename }}
                    </div>
                    <div :class="['download-status-badge', \`status-\${download.status}\`]">
                        {{ download.status.toUpperCase() }}
                    </div>
                </div>
                <div class="download-progress-container">
                    <div class="download-progress-bar" :style="{ width: download.percentage + '%' }">
                        <span class="progress-text" v-if="download.percentage >= 10">{{ download.percentage.toFixed(1) }}%</span>
                    </div>
                    <span class="progress-percentage-label" v-if="download.percentage < 10">{{ download.percentage.toFixed(1) }}%</span>
                </div>
                <div class="download-info-grid">
                    <div class="download-info-item">
                        <span class="download-info-label">ダウンロード済み</span>
                        <span class="download-info-value">
                            {{ (download.downloadedBytes / (1024 * 1024)).toFixed(2) }} MB / {{ (download.totalBytes / (1024 * 1024)).toFixed(2) }} MB
                        </span>
                    </div>
                    <div class="download-info-item">
                        <span class="download-info-label">速度</span>
                        <span class="download-info-value">
                            {{ download.speed >= 1024 * 1024 
                               ? (download.speed / (1024 * 1024)).toFixed(2) + ' MB/s' 
                               : (download.speed / 1024).toFixed(2) + ' KB/s' }}
                        </span>
                    </div>
                    <div class="download-info-item">
                        <span class="download-info-label">残り時間</span>
                        <span class="download-info-value">
                            {{ download.remainingTime > 0 ? formatTime(download.remainingTime) : '--' }}
                        </span>
                    </div>
                    <div class="download-info-item">
                        <span class="download-info-label">完了予定</span>
                        <span class="download-info-value">
                            {{ download.remainingTime > 0 && download.remainingTime < 86400
                               ? new Date(Date.now() + download.remainingTime * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                               : '--' }}
                        </span>
                    </div>
                    <div class="download-info-item" v-if="download.status === 'downloading'">
                        <button
                            @click="cancelDownload(download.taskId)"
                            class="btn btn-danger btn-sm"
                            style="width: 100%; margin-top: auto;"
                        >
                            <i class="fas fa-times"></i> キャンセル
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

