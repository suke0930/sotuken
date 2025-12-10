// Servers Tab Template
export const serversTabTemplate = `
<div v-show="activeTab === 'servers'" class="content-section active">
    <div class="section-title">
        <i class="fas fa-server"></i>
        Minecraftサーバー一覧
    </div>

    <div v-if="serversLoading" class="empty-state">
        <i class="fas fa-spinner fa-spin" style="font-size: 36px; color: var(--theme-primary);"></i>
        <h3>サーバー一覧を読み込み中...</h3>
        <p>少々お待ちください</p>
    </div>

    <div v-else-if="servers.length === 0" class="empty-state">
        <i class="fas fa-server"></i>
        <h3>サーバーが登録されていません</h3>
        <p>「新規作成」タブから最初のMinecraftサーバーを追加してください。</p>
        <button class="btn btn-primary" @click="switchTab('create')">
            <i class="fas fa-plus-circle"></i>
            サーバーを作成する
        </button>
    </div>

    <div v-else class="servers-grid">
        <div
            v-for="server in servers"
            :key="server.uuid"
            class="server-card"
        >
            <div :class="['server-status', server.status === 'running' ? 'running' : server.status === 'crashed' ? 'crashed' : 'stopped']">
                {{ server.status === 'running' ? '🟢 稼働中' : server.status === 'crashed' ? '⚠️ Crash!' : '🔴 停止中' }}
            </div>

            <div class="server-name">
                <i class="fas fa-cube" style="color: var(--theme-primary); margin-right: 6px; font-size: 14px;"></i>
                {{ server.name }}
            </div>

            <div v-if="server.note" style="padding: 8px 16px; font-size: 12px; color: var(--theme-text-secondary); border-bottom: 1px solid var(--theme-border);">
                <i class="fas fa-sticky-note" style="margin-right: 6px;"></i>
                {{ server.note }}
            </div>

            <div class="server-details">
                <div class="server-detail">
                    <span class="server-detail-label">
                        <i class="fas fa-code-branch"></i> バージョン
                    </span>
                    <span class="server-detail-value">{{ server.software.version }}</span>
                </div>
                <div class="server-detail">
                    <span class="server-detail-label">
                        <i class="fas fa-cogs"></i> ソフトウェア
                    </span>
                    <span class="server-detail-value">{{ server.software.name }}</span>
                </div>
                <div class="server-detail">
                    <span class="server-detail-label">
                        <i class="fas fa-coffee"></i> JDK
                    </span>
                    <span class="server-detail-value">JDK {{ server.launchConfig.jdkVersion }}</span>
                </div>
                <div class="server-detail">
                    <span class="server-detail-label">
                        <i class="fas fa-network-wired"></i> ポート
                    </span>
                    <span class="server-detail-value">{{ server.launchConfig.port }}</span>
                </div>
                <div class="server-detail">
                    <span class="server-detail-label">
                        <i class="fas fa-memory"></i> メモリ
                    </span>
                    <span class="server-detail-value">{{ server.launchConfig.minMemory }}MB ~ {{ server.launchConfig.maxMemory }}MB</span>
                </div>
                <div class="server-detail">
                    <span class="server-detail-label">
                        <i class="fas fa-calendar-alt"></i> 作成日
                    </span>
                    <span class="server-detail-value">{{ formatDate(server.metadata.createdAt) }}</span>
                </div>
            </div>

            <div class="server-actions">
                <button
                    v-if="server.status === 'stopped' || server.status === 'crashed'"
                    class="btn btn-success btn-sm"
                    @click="startServer(server)"
                >
                    <i class="fas fa-play"></i>
                    {{ server.status === 'crashed' ? '再起動' : '起動' }}
                </button>
                <button
                    v-else-if="server.status === 'running'"
                    class="btn btn-danger btn-sm"
                    @click="stopServer(server)"
                >
                    <i class="fas fa-stop"></i>
                    停止
                </button>
                <button
                    class="btn btn-secondary btn-sm"
                    @click="openConsole(server)"
                    title="コンソールを開く"
                >
                    <i class="fas fa-terminal"></i>
                    コンソール
                </button>
                <button
                    class="btn btn-secondary btn-sm"
                    @click="openPropertiesModal(server)"
                    title="サーバープロパティを編集"
                >
                    <i class="fas fa-sliders-h"></i>
                    プロパティ
                </button>
                <button
                    class="btn btn-secondary btn-sm"
                    @click="openUpdateModal(server)"
                    title="サーバー設定を編集"
                >
                    <i class="fas fa-edit"></i>
                    編集
                </button>
                <button
                    v-if="server.status === 'stopped' || server.status === 'crashed'"
                    class="btn btn-danger btn-sm"
                    @click="deleteServer(server)"
                >
                    <i class="fas fa-trash"></i>
                    削除
                </button>
            </div>
        </div>
    </div>
</div>
`;

