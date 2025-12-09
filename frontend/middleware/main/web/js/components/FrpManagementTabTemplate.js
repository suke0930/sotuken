// FRP Management Tab Template
export const frpManagementTabTemplate = `
<section v-if="activeTab === 'frp'" class="tab-section frp-tab">
    <div class="card-grid">
        <div class="card">
            <div class="card-header">
                <div>
                    <h3>FRP認証</h3>
                    <p class="muted">Discordリンク状態とセッション上限を確認できます</p>
                </div>
                <div class="badge" :class="frpAuthStatus.state">{{ frpAuthStatus.state || 'idle' }}</div>
            </div>
            <div class="auth-status-block">
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
                </div>
                <div class="auth-actions">
                    <button class="btn ghost" @click="refreshFrpOverview">状態更新</button>
                </div>
                <p class="muted" v-if="frpLastUpdated">最終更新: {{ new Date(frpLastUpdated).toLocaleTimeString() }}</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div>
                    <h3>FRPエントリ作成</h3>
                    <p class="muted">Minecraftエントリからポートを自動入力できます</p>
                </div>
            </div>
            <div class="form-grid">
                <label>リモートポート
                    <input type="number" v-model="frpForm.remotePort" placeholder="例: 25565">
                </label>
                <label>ローカルポート
                    <input type="number" v-model="frpForm.localPort" placeholder="例: 25565">
                </label>
                <label>表示名
                    <input type="text" v-model="frpForm.displayName" placeholder="任意">
                </label>
                <label>Minecraftエントリから選択
                    <select v-model="frpForm.selectedServerId" @change="pickMinecraftPort(frpForm.selectedServerId)">
                        <option value="">選択してください</option>
                        <option v-for="srv in servers" :key="srv.uuid || srv.id" :value="srv.uuid || srv.id">
                            {{ srv.serverName || srv.name || srv.id }} (port: {{ srv.port || srv.serverPort || srv.Port }})
                        </option>
                    </select>
                </label>
                <label>extraMetas (JSON)
                    <textarea rows="3" v-model="frpForm.extraMetas" placeholder='{"key":"value"}'></textarea>
                </label>
                <div class="form-actions">
                    <button class="btn primary" @click="createFrpSession" :disabled="frpCreatingSession">セッション開始</button>
                    <button class="btn ghost" @click="refreshFrpOverview(true)">一覧更新</button>
                </div>
            </div>
            <div v-if="frpMe?.permissions" class="muted small">
                利用可能ポート: {{ frpMe.permissions.allowedPorts?.join(', ') || 'なし' }} / 最大セッション: {{ frpMe.permissions.maxSessions }}
            </div>
        </div>
    </div>

    <div class="card-grid">
        <div class="card">
            <div class="card-header">
                <h3>サーバープロセス (/processes)</h3>
            </div>
            <div v-if="frpProcesses.length === 0" class="muted">起動中プロセスはありません</div>
            <div class="list" v-else>
                <div v-for="proc in frpProcesses" :key="proc.sessionId" class="list-item">
                    <div>
                        <strong>{{ proc.sessionId }}</strong>
                        <div class="muted">port: {{ proc.remotePort }} → {{ proc.localPort }}</div>
                        <div class="muted">user: {{ proc.discordId }}</div>
                    </div>
                    <div class="actions">
                        <span class="badge" :class="proc.status">{{ proc.status }}</span>
                        <button class="btn ghost" @click="fetchFrpLogs(proc.sessionId)">ログ</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>セッション (/sessions & /me)</h3>
            </div>
            <div v-if="frpSessions.length === 0 && !(frpMe?.activeSessions?.sessions?.length)" class="muted">セッションはありません</div>
            <div class="list" v-else>
                <div v-for="session in frpSessions" :key="session.sessionId" class="list-item">
                    <div>
                        <strong>{{ session.displayName || session.sessionId }}</strong>
                        <div class="muted">port: {{ session.remotePort }} → {{ session.localPort }}</div>
                        <div class="muted">status: {{ session.status }}</div>
                    </div>
                    <div class="actions">
                        <button class="btn ghost" @click="fetchFrpLogs(session.sessionId)">ログ</button>
                        <button class="btn danger ghost" @click="stopFrpSession(session.sessionId)">停止</button>
                    </div>
                </div>
                <div v-for="session in frpMe?.activeSessions?.sessions || []" :key="session.sessionId + '-me'" class="list-item secondary">
                    <div>
                        <strong>{{ session.sessionId }}</strong>
                        <div class="muted">port: {{ session.remotePort }}</div>
                        <div class="muted">fingerprint: {{ session.fingerprint }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card" v-if="frpWarnings.length">
        <h3>警告</h3>
        <ul>
            <li v-for="w in frpWarnings" :key="w">{{ w }}</li>
        </ul>
    </div>

    <div class="card">
        <div class="card-header">
            <h3>frpcログ</h3>
            <div class="actions">
                <input type="number" v-model.number="frpLogs.lines" min="10" max="500" style="width: 90px;">
                <button class="btn ghost" @click="frpLogs.sessionId ? fetchFrpLogs(frpLogs.sessionId, frpLogs.lines) : null">再取得</button>
            </div>
        </div>
        <div class="log-controls">
            <label>セッションID
                <input type="text" v-model="frpLogs.sessionId" placeholder="frp-xxxx" />
            </label>
            <button class="btn ghost" @click="frpLogs.sessionId && fetchFrpLogs(frpLogs.sessionId, frpLogs.lines)" :disabled="!frpLogs.sessionId">取得</button>
        </div>
        <div class="log-viewer">
            <div v-if="frpLogs.loading" class="muted">読み込み中...</div>
            <div v-else-if="frpLogs.error" class="error">{{ frpLogs.error }}</div>
            <pre v-else class="log-text">{{ frpLogs.entries.join('\\n') }}</pre>
        </div>
    </div>
</section>
`;
