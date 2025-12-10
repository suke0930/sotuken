// FRP Management Tab Template
export const frpManagementTabTemplate = `
<section v-if="activeTab === 'frp'" class="tab-section frp-tab frp-console">
    <div class="frp-hero">
        <div>
            <p class="frp-kicker">Network Tunneling</p>
            <h2>FRP Manager</h2>
            <p class="muted">Minecraftサーバーを安全に外部公開。リンク状態・残りセッション・許可ポートを一目で把握できます。</p>
            <div class="frp-hero-meta">
                <span class="frp-chip">公開ドメイン: {{ frpPublicDomain }}</span>
                <span class="frp-chip subtle" v-if="frpLastUpdated">最終更新 {{ new Date(frpLastUpdated).toLocaleTimeString() }}</span>
                <span class="frp-chip" :class="'state-' + (frpAuthStatus.state || 'idle')">{{ frpAuthStatus.state || 'idle' }}</span>
            </div>
        </div>
        <div class="frp-hero-stats">
            <div class="frp-stat">
                <span class="label">稼働セッション</span>
                <div class="value">{{ frpPublications.filter(p => p.status === 'running').length }}</div>
                <small>全 {{ frpPublications.length }} / 残り {{ frpMe?.remainingSessions !== undefined && frpMe?.remainingSessions !== null ? frpMe.remainingSessions : '---' }}</small>
            </div>
            <div class="frp-stat">
                <span class="label">許可ポート</span>
                <div class="value">{{ frpMe?.permissions?.allowedPorts?.length || 0 }}</div>
                <small>{{ frpMe?.permissions?.allowedPorts?.join(', ') || '未設定' }}</small>
            </div>
            <div class="frp-stat">
                <span class="label">リンク</span>
                <div class="value" :class="{ positive: frpAuthStatus.linked, caution: !frpAuthStatus.linked }">
                    {{ frpAuthStatus.linked ? 'Linked' : 'Not linked' }}
                </div>
                <small>{{ frpAuthStatus.discordUser?.username || '---' }}</small>
            </div>
        </div>
    </div>

    <div class="card frp-card frp-card--control">
        <div class="frp-card__header">
            <div>
                <p class="frp-eyebrow">セットアップ</p>
                <h3>リンクと公開をコントロール</h3>
                <p class="muted">Discord認証から公開ポートの設定まで、必要な情報をひとまとめにしました。</p>
            </div>
            <div class="frp-card__header-actions">
                <span class="frp-pill" :class="'state-' + (frpAuthStatus.state || 'idle')">
                    <i class="fas fa-signal"></i>
                    {{ frpAuthStatus.state || 'idle' }}
                </span>
                <button class="btn ghost" @click="refreshFrpOverview">状態更新</button>
            </div>
        </div>

        <div class="frp-card__grid">
            <div class="frp-auth-panel">
                <div class="frp-info-grid">
                    <div class="frp-info-line">
                        <span>リンク状態</span>
                        <span class="frp-tag" :class="{ 'is-linked': frpAuthStatus.linked }">
                            <i class="fas" :class="frpAuthStatus.linked ? 'fa-lock-open' : 'fa-lock'"></i>
                            {{ frpAuthStatus.linked ? 'リンク済み' : '未リンク' }}
                        </span>
                    </div>
                    <div class="frp-info-line">
                        <span>ユーザー</span>
                        <strong>{{ frpAuthStatus.discordUser?.username || '---' }}</strong>
                    </div>
                    <div class="frp-info-line" v-if="frpMe?.permissions">
                        <span>許可ポート</span>
                        <div class="frp-port-chips">
                            <span v-for="p in frpMe.permissions.allowedPorts" :key="'allowed-' + p" class="frp-chip subtle">:{{ p }}</span>
                            <span v-if="!frpMe.permissions.allowedPorts?.length" class="muted">なし</span>
                        </div>
                    </div>
                    <div class="frp-info-line" v-if="frpMe?.remainingSessions !== undefined">
                        <span>残りセッション</span>
                        <strong>{{ frpMe.remainingSessions }}</strong>
                    </div>
                    <div class="frp-info-line" v-if="frpAuthStatus?.expiresAt">
                        <span>トークン有効期限</span>
                        <div class="frp-expiry-chip">
                            <i class="fas fa-clock"></i>
                            <span>
                                {{ formatRemainingTime ? formatRemainingTime(new Date(frpAuthStatus.expiresAt) - Date.now()) : frpAuthStatus.expiresAt }}
                            </span>
                            <small class="muted">{{ new Date(frpAuthStatus.expiresAt).toLocaleString() }}</small>
                        </div>
                    </div>
                    <div class="frp-info-line" v-if="frpAuthStatus.authUrl">
                        <span>認証URL</span>
                        <button class="btn ghost compact" @click="openFrpAuthUrl">
                            <i class="fas fa-external-link-alt"></i>
                            再度開く
                        </button>
                    </div>
                </div>
                <div class="frp-actions-row">
                    <button class="btn btn-primary" @click="initFrpAuth" :disabled="frpAuthInit.loading || isAuthCooldown">
                        <i v-if="frpAuthInit.loading" class="fas fa-spinner fa-spin"></i>
                        <i v-else class="fab fa-discord"></i>
                        {{ frpAuthInit.loading ? '認証準備中...' : 'Discordとリンク' }}
                    </button>
                    <button class="btn ghost" @click="pollFrpAuth()" :disabled="frpAuthStatus.state !== 'pending'">手動ポーリング</button>
                    <button class="btn ghost" @click="refreshFrpTokens">トークン更新</button>
                    <button class="btn danger ghost" @click="logoutFrp">リンク解除</button>
                    <button class="btn ghost" @click="refreshFrpOverview">状態更新</button>
                </div>
                <p class="muted small" v-if="frpLastUpdated">最終更新: {{ new Date(frpLastUpdated).toLocaleTimeString() }}</p>
            </div>

            <div class="frp-form-panel">
                <div class="frp-section-header">
                    <p class="frp-eyebrow">公開設定</p>
                    <div>
                        <h4>トンネルを立ち上げ</h4>
                        <p class="muted small">サーバーとポートを選ぶだけで公開URLを生成。許可ポートと残り枠をリアルタイムに照合します。</p>
                    </div>
                </div>

                <div class="frp-form-grid">
                    <label class="frp-field">
                        <span class="frp-field__label">Minecraftサーバー</span>
                        <div class="frp-input with-icon">
                            <i class="fas fa-hdd"></i>
                            <select v-model="frpForm.selectedServerId" @change="selectFrpServer(frpForm.selectedServerId)">
                                <option value="">選択してください</option>
                                <option v-for="srv in servers" :key="srv.uuid || srv.id" :value="srv.uuid || srv.id">
                                    {{ srv.serverName || srv.name || srv.id }} (port: {{ srv.launchConfig?.port || srv.port || srv.serverPort || srv.Port }})
                                </option>
                            </select>
                        </div>
                    </label>
                    <label class="frp-field">
                        <span class="frp-field__label">ローカルポート</span>
                        <div class="frp-input with-icon">
                            <i class="fas fa-plug"></i>
                            <input type="text" :value="frpForm.localPort" disabled>
                        </div>
                    </label>
                    <label class="frp-field">
                        <span class="frp-field__label">公開URL</span>
                        <div class="frp-input with-icon">
                            <i class="fas fa-link"></i>
                            <input type="text" :value="frpForm.publicUrl" disabled placeholder="example.com:----">
                        </div>
                    </label>
                </div>

                <div class="frp-form-footer">
                    <div class="frp-availability">
                        <div v-if="!computeAvailableRemotePorts().length">公開可能なポートがありません</div>
                        <div v-else>利用可能なポート: {{ computeAvailableRemotePorts().join(', ') }}</div>
                        <div v-if="frpMe?.remainingSessions !== undefined">残りセッション: {{ frpMe.remainingSessions }}</div>
                    </div>
                    <div class="frp-form-actions">
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
                </div>

                <div class="frp-form-errors">
                    <div v-if="!frpFormValidation.remotePort.valid" class="frp-form-error">
                        <i class="fas fa-exclamation-circle"></i>
                        {{ frpFormValidation.remotePort.error }}
                    </div>
                    <div v-if="!frpFormValidation.localPort.valid" class="frp-form-error">
                        <i class="fas fa-exclamation-circle"></i>
                        {{ frpFormValidation.localPort.error }}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card frp-card frp-card--table">
        <div class="frp-card__header">
            <div>
                <p class="frp-eyebrow">稼働状況</p>
                <h3>現在の公開</h3>
                <p class="muted">サーバー名・URL・状態をひとつにまとめました。新規接続の可否はJWT有効期限に依存します。</p>
            </div>
            <button class="btn ghost" @click="refreshFrpOverview">更新</button>
        </div>
        <div v-if="!frpPublications.length" class="muted frp-empty">現在公開中のエントリはありません</div>
        <div class="frp-table" v-else>
            <div class="frp-table-head">
                <span>サーバー</span>
                <span>ローカル</span>
                <span>公開URL</span>
                <span>状態</span>
                <span>操作</span>
            </div>
            <div class="frp-table-row" v-for="pub in frpPublicationsWithExpiry" :key="pub.sessionId">
                <span>
                    <strong>{{ pub.serverName }}</strong>
                    <small class="muted">ID: {{ pub.sessionId }}</small>
                </span>
                <span>{{ pub.localPort }}</span>
                <span class="mono">{{ pub.publicUrl }}</span>
                <span>
                    <span class="frp-status-badge" :class="'frp-status-' + pub.status" :title="pub.lastError || ''">
                        <i class="frp-status-icon" :class="getStatusIcon(pub.status)"></i>
                        <span class="frp-status-text">{{ getStatusText(pub.status) }}</span>
                        <span v-if="pub.status === 'running'" class="frp-status-pulse"></span>
                    </span>
                </span>
                <span class="actions">
                    <button class="btn ghost" @click="openFrpLogModal(pub.sessionId, pub.serverName)">ログ</button>
                    <button class="btn ghost" @click="startFrpPublication(pub)" :disabled="['running', 'starting', 'stopping'].includes(pub.status)">起動</button>
                    <button class="btn warning ghost" @click="stopFrpSession(pub.sessionId)" :disabled="pub.status === 'stopped'">停止</button>
                    <button class="btn danger ghost" @click="deleteFrpPublication(pub)">削除</button>
                </span>
            </div>
        </div>
    </div>

    <div class="card frp-card frp-card--warnings" v-if="frpWarnings.length">
        <div class="frp-card__header">
            <div>
                <p class="frp-eyebrow">警告</p>
                <h3>確認が必要なイベント</h3>
            </div>
        </div>
        <ul class="frp-warning-list">
            <li v-for="w in frpWarnings" :key="w">
                <i class="fas fa-triangle-exclamation"></i>
                <span>{{ w }}</span>
            </li>
        </ul>
    </div>

    <div class="modal-backdrop" v-if="frpLogModal.visible" @click.self="closeFrpLogModal">
        <div class="modal frp-modal">
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
