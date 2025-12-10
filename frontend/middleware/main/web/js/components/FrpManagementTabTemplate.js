// FRP Management Tab Template
export const frpManagementTabTemplate = `
<section v-if="activeTab === 'frp'" class="tab-section frp-tab">
    <div class="card">
        <div class="card-header">
            <div>
                <h3>Minecraftサーバーのポートを外部公開</h3>
                <p class="muted">サーバーを選ぶだけでローカルポートを公開URLにマッピングします</p>
            </div>
            <div class="badge" :class="frpAuthStatus.state">{{ frpAuthStatus.state || 'idle' }}</div>
        </div>
        <div class="auth-block">
            <div class="auth-row">
                <span>リンク状態</span>
                <strong>{{ frpAuthStatus.linked ? 'リンク済み' : '未リンク' }}</strong>
            </div>
            <div class="auth-row">
                <span>ユーザー</span>
                <strong>{{ frpAuthStatus.discordUser?.username || '---' }}</strong>
            </div>
            <div class="auth-row" v-if="frpMe?.permissions">
                <span>許可ポート</span>
                <strong>{{ frpMe.permissions.allowedPorts?.join(', ') || 'なし' }}</strong>
            </div>
            <div class="auth-row" v-if="frpMe?.remainingSessions !== undefined">
                <span>残りセッション</span>
                <strong>{{ frpMe.remainingSessions }}</strong>
            </div>
            <div class="auth-row" v-if="frpAuthStatus.authUrl">
                <span>認証URL</span>
                <button class="btn ghost" @click="openFrpAuthUrl">ブラウザで開く</button>
            </div>
            <div class="auth-actions">
                <button class="btn" @click="initFrpAuth" :disabled="frpAuthLoading">Discordとリンク</button>
                <button class="btn ghost" @click="pollFrpAuth()" :disabled="frpAuthStatus.state !== 'pending'">手動ポーリング</button>
                <button class="btn ghost" @click="refreshFrpTokens">トークン更新</button>
                <button class="btn danger ghost" @click="logoutFrp">リンク解除</button>
                <button class="btn ghost" @click="refreshFrpOverview">状態更新</button>
            </div>
            <p class="muted" v-if="frpLastUpdated">最終更新: {{ new Date(frpLastUpdated).toLocaleTimeString() }}</p>
        </div>
        <div class="divider"></div>

        <div class="form-grid">
            <label>Minecraftサーバー
                <select v-model="frpForm.selectedServerId" @change="selectFrpServer(frpForm.selectedServerId)">
                    <option value="">選択してください</option>
                    <option v-for="srv in servers" :key="srv.uuid || srv.id" :value="srv.uuid || srv.id">
                        {{ srv.serverName || srv.name || srv.id }} (port: {{ srv.launchConfig?.port || srv.port || srv.serverPort || srv.Port }})
                    </option>
                </select>
            </label>
            <label>ローカルポート
                <input type="text" :value="frpForm.localPort" disabled>
            </label>
            <label>公開URL
                <input type="text" :value="frpForm.publicUrl" disabled placeholder="example.com:----">
            </label>
            <div class="form-actions">
                <button
                    class="btn primary"
                    @click="createFrpSession()"
                    :disabled="!frpAuthStatus.linked || !frpForm.localPort || !frpForm.remotePort || frpCreatingSession || !computeAvailableRemotePorts().length || (frpMe?.remainingSessions !== undefined && frpMe.remainingSessions <= 0)"
                >
                    公開を開始
                </button>
                <button
                    class="btn ghost"
                    :disabled="!frpAuthStatus.linked || !frpPublications.some(p => p.localPort === Number(frpForm.localPort))"
                    @click="() => { const pub = frpPublications.find(p => p.localPort === Number(frpForm.localPort)); pub && stopFrpSession(pub.sessionId); }"
                >
                    停止
                </button>
            </div>
            <div class="muted small">
                <div v-if="!computeAvailableRemotePorts().length">公開可能なポートがありません</div>
                <div v-else>利用可能なポート: {{ computeAvailableRemotePorts().join(', ') }}</div>
                <div v-if="frpMe?.remainingSessions !== undefined">残りセッション: {{ frpMe.remainingSessions }}</div>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <div>
                <h3>現在の公開</h3>
                <p class="muted">サーバー名 / ローカルポート / 公開URL / 状態</p>
            </div>
            <button class="btn ghost" @click="refreshFrpOverview">更新</button>
        </div>
        <div v-if="!frpPublications.length" class="muted">現在公開中のエントリはありません</div>
        <div class="table" v-else>
            <div class="table-head">
                <span>サーバー</span>
                <span>ローカル</span>
                <span>公開URL</span>
                <span>状態</span>
                <span>操作</span>
            </div>
            <div class="table-row" v-for="pub in frpPublications" :key="pub.sessionId">
                <span>{{ pub.serverName }}</span>
                <span>{{ pub.localPort }}</span>
                <span class="mono">{{ pub.publicUrl }}</span>
                <span><span class="badge" :class="['status', 'status-' + pub.status]" :title="pub.lastError || ''">{{ pub.status }}</span></span>
                <span class="actions">
                    <button class="btn ghost" @click="openFrpLogModal(pub.sessionId, pub.serverName)">ログ</button>
                    <button class="btn ghost" @click="startFrpPublication(pub)" :disabled="['running', 'starting', 'stopping'].includes(pub.status)">起動</button>
                    <button class="btn warning ghost" @click="stopFrpSession(pub.sessionId)" :disabled="pub.status === 'stopped'">停止</button>
                    <button class="btn danger ghost" @click="deleteFrpPublication(pub)">削除</button>
                </span>
            </div>
        </div>
    </div>

    <div class="card" v-if="frpWarnings.length">
        <h3>警告</h3>
        <ul>
            <li v-for="w in frpWarnings" :key="w">{{ w }}</li>
        </ul>
    </div>

    <div class="modal-backdrop" v-if="frpLogModal.visible" @click.self="closeFrpLogModal">
        <div class="modal">
            <div class="modal-header">
                <h3>frpcログ - {{ frpLogModal.title }}</h3>
                <button class="btn ghost" @click="closeFrpLogModal">閉じる</button>
            </div>
            <div class="modal-controls">
                <label>行数
                    <input type="number" v-model.number="frpLogModal.lines" min="10" max="500" style="width: 90px;">
                </label>
                <button class="btn ghost" @click="frpLogModal.sessionId && fetchFrpLogsForModal(frpLogModal.sessionId, frpLogModal.lines)" :disabled="!frpLogModal.sessionId || frpLogModal.loading">再取得</button>
            </div>
            <div class="modal-body">
                <div v-if="frpLogModal.loading" class="muted">読み込み中...</div>
                <div v-else-if="frpLogModal.error" class="error">{{ frpLogModal.error }}</div>
                <pre v-else class="log-text">{{ frpLogModal.entries.join('\\n') }}</pre>
            </div>
        </div>
    </div>
</section>
`;
