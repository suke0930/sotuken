// FRP Manager Logic
import { API_ENDPOINTS } from '../Endpoints.js';
import { apiDelete, apiGet, apiPost } from '../utils/api.js';

export function createFrpMethods() {
    return {
        computeAvailableRemotePorts() {
            const allowed = this.frpMe?.permissions?.allowedPorts || [];
            if (!allowed.length) return [];
            const used = new Set();
            (this.frpProcesses || []).forEach(p => used.add(p.remotePort));
            (this.frpSessions || []).forEach(s => used.add(s.remotePort));
            (this.frpMe?.activeSessions?.sessions || []).forEach(s => used.add(s.remotePort));
            return allowed.filter(p => !used.has(p)).sort((a, b) => a - b);
        },

        selectFrpServer(serverId) {
            this.frpForm.selectedServerId = serverId || '';
            const target = this.servers.find((s) => s.uuid === serverId || s.id === serverId);
            const localPort = target
                ? (target.launchConfig?.port || target.port || target.serverPort || target.Port)
                : '';
            this.frpForm.localPort = localPort || '';
            const available = this.computeAvailableRemotePorts();
            const picked = available[0] || '';
            this.frpForm.remotePort = picked;
            this.updateFrpPublicUrl();
        },

        updateFrpPublicUrl() {
            if (this.frpForm.remotePort) {
                this.frpForm.publicUrl = `${this.frpPublicDomain}:${this.frpForm.remotePort}`;
            } else {
                this.frpForm.publicUrl = '';
            }
        },

        buildFrpPublications() {
            const domain = this.frpPublicDomain || 'example.com';
            const publications = [];
            const sessionsById = new Map();
            (this.frpSessions || []).forEach((s) => sessionsById.set(s.sessionId, s));

            for (const session of this.frpSessions || []) {
                const proc = (this.frpProcesses || []).find((p) => p.sessionId === session.sessionId);
                const status = proc?.status || session.status || 'running';
                const server = this.servers.find(
                    (s) => (s.launchConfig?.port || s.port || s.serverPort || s.Port) === session.localPort
                );
                publications.push({
                    sessionId: session.sessionId,
                    serverName: server?.serverName || server?.name || server?.id || session.sessionId,
                    localPort: session.localPort,
                    remotePort: session.remotePort,
                    publicUrl: `${domain}:${session.remotePort}`,
                    status,
                });
            }

            // processes without session record (fallback)
            for (const proc of this.frpProcesses || []) {
                if (sessionsById.has(proc.sessionId)) continue;
                const server = this.servers.find(
                    (s) => (s.launchConfig?.port || s.port || s.serverPort || s.Port) === proc.localPort
                );
                publications.push({
                    sessionId: proc.sessionId,
                    serverName: server?.serverName || server?.name || server?.id || proc.sessionId,
                    localPort: proc.localPort,
                    remotePort: proc.remotePort,
                    publicUrl: `${domain}:${proc.remotePort}`,
                    status: proc.status || 'running',
                });
            }

            this.frpPublications = publications;
        },

        async fetchFrpAuthStatus() {
            try {
                const res = await apiGet(API_ENDPOINTS.frp.authStatus);
                if (res.ok) {
                    this.frpAuthStatus = res.data || { linked: false };
                    // authUrlは必要なときだけ保持する
                    if (!this.frpAuthStatus.authUrl && this.frpAuthInit?.authUrl) {
                        this.frpAuthStatus.authUrl = this.frpAuthInit.authUrl;
                    }
                } else {
                    this.frpAuthStatus = { linked: false, state: 'error', message: res.error || 'status error' };
                }
            } catch (error) {
                console.error('FRP auth status failed', error);
                this.frpAuthStatus = { linked: false, state: 'error', message: error.message };
            }
        },

        async initFrpAuth() {
            this.frpAuthLoading = true;
            this.frpAuthError = '';
            try {
                const res = await apiPost(API_ENDPOINTS.frp.authInit, {});
                if (res.ok) {
                    this.frpAuthInit = res.data;
                    this.frpAuthStatus = { ...(this.frpAuthStatus || {}), state: 'pending', authUrl: res.data.authUrl };
                    this.showSuccess('Discord連携を開始しました。ブラウザで認証を完了してください。');
                } else {
                    this.frpAuthError = res.error || '認証初期化に失敗しました';
                    this.showError(this.frpAuthError);
                }
            } catch (error) {
                this.frpAuthError = error.message;
                this.showError(error.message);
            } finally {
                this.frpAuthLoading = false;
            }
        },

        async pollFrpAuth(tempToken) {
            try {
                const token = tempToken || this.frpAuthInit?.tempToken;
                if (!token) {
                    this.showError('tempTokenがありません。先に「Discordとリンク」を実行してください。');
                    return;
                }
                const res = await apiGet(`${API_ENDPOINTS.frp.authPoll}?tempToken=${encodeURIComponent(token)}`);
                if (res.ok) {
                    this.frpAuthStatus = { ...(this.frpAuthStatus || {}), state: res.data.status, authUrl: this.frpAuthStatus?.authUrl };
                    if (res.data.status === 'completed') {
                        this.frpAuthStatus.linked = true;
                        this.frpAuthStatus.discordUser = res.data.discordUser;
                        this.frpAuthStatus.authUrl = null; // 認証完了後は表示しない
                        await this.refreshFrpOverview();
                        this.showSuccess('Discord連携が完了しました。');
                    } else if (res.data.status === 'expired') {
                        this.showError('認証が期限切れです。再度「Discordとリンク」を実行してください。');
                    }
                } else {
                    this.showError(res.error || '認証状態の取得に失敗しました');
                }
            } catch (error) {
                this.showError(error.message);
            }
        },

        async refreshFrpTokens() {
            try {
                const res = await apiPost(API_ENDPOINTS.frp.authRefresh, {});
                if (res.ok) {
                    this.showSuccess('トークンを更新しました');
                    // expiresAt などをUIに反映させるため、ステータスを再取得
                    await this.refreshFrpOverview(false);
                } else {
                    this.showError(res.error || 'トークン更新に失敗しました');
                }
            } catch (error) {
                this.showError(error.message);
            }
        },

        async logoutFrp() {
            try {
                const confirmed = window.confirm('Discordリンクを解除しますか？');
                if (!confirmed) return;
                await apiPost(API_ENDPOINTS.frp.authLogout, {});
            } catch (error) {
                console.warn('FRP logout failed', error);
            } finally {
                this.frpAuthStatus = { linked: false, state: 'idle' };
                this.frpMe = null;
                this.frpSessions = [];
                this.frpProcesses = [];
                this.frpWarnings = [];
                this.frpAuthInit = null;
            }
        },

        async fetchFrpMe() {
            if (!this.frpAuthStatus?.linked) {
                this.frpMe = null;
                return;
            }
            try {
                const res = await apiGet(API_ENDPOINTS.frp.me);
                if (res.ok) {
                    this.frpMe = res.data;
                } else {
                    this.frpMe = null;
                    if (res.error !== 'Not authenticated') {
                        this.showError(res.error || 'ユーザー情報の取得に失敗しました');
                    }
                }
            } catch (error) {
                this.frpMe = null;
                if (error?.message && error.message !== 'Not authenticated') {
                    this.showError(error.message);
                }
            }
        },

        async fetchFrpSessions() {
            if (!this.frpAuthStatus?.linked) {
                this.frpSessions = [];
                return;
            }
            try {
                const res = await apiGet(API_ENDPOINTS.frp.sessions);
                if (res.ok) {
                    // Filter out "stopped" sessions to prevent them from appearing in UI
                    this.frpSessions = (res.data || []).filter(s => s.status !== 'stopped');
                } else {
                    this.showError(res.error || 'セッション取得に失敗しました');
                }
            } catch (error) {
                this.showError(error.message);
            }
        },

        async fetchFrpProcesses() {
            if (!this.frpAuthStatus?.linked) {
                this.frpProcesses = [];
                return;
            }
            try {
                const res = await apiGet(API_ENDPOINTS.frp.processes);
                if (res.ok) {
                    this.frpProcesses = res.data || [];
                } else {
                    this.showError(res.error || 'プロセス取得に失敗しました');
                }
            } catch (error) {
                this.showError(error.message);
            }
        },

        async refreshFrpOverview(skipStatus = false) {
            this.frpLoadingOverview = true;
            try {
                if (!skipStatus) {
                    await this.fetchFrpAuthStatus();
                }
                // 未リンクならAPI呼び出しを抑止
                if (!this.frpAuthStatus?.linked) {
                    this.frpMe = null;
                    this.frpSessions = [];
                    this.frpProcesses = [];
                    this.frpWarnings = [];
                    return;
                } else {
                    await Promise.all([this.fetchFrpMe(), this.fetchFrpSessions(), this.fetchFrpProcesses()]);
                    this.computeFrpWarnings();
                    this.buildFrpPublications();
                }
                this.frpLastUpdated = new Date().toISOString();
            } finally {
                this.frpLoadingOverview = false;
            }
        },

        computeFrpWarnings() {
            const warnings = [];
            if (this.frpMe?.activeSessions?.sessions && this.frpProcesses?.length >= 0) {
                const processPorts = new Set(this.frpProcesses.map(p => p.remotePort));
                for (const s of this.frpMe.activeSessions.sessions) {
                    if (!processPorts.has(s.remotePort)) {
                        warnings.push(`セッション ${s.sessionId} (port ${s.remotePort}) はプロセス一覧にありません。`);
                    }
                }
            }
            if (this.frpSessions?.length && this.frpProcesses?.length >= 0) {
                const procIds = new Set(this.frpProcesses.map(p => p.sessionId));
                for (const session of this.frpSessions) {
                    if (!procIds.has(session.sessionId)) {
                        warnings.push(`セッション ${session.sessionId} は起動中プロセスに存在しません。`);
                    }
                }
            }
            this.frpWarnings = warnings;
        },

        pickMinecraftPort(serverId) {
            this.selectFrpServer(serverId);
        },

        async createFrpSession() {
            this.frpCreatingSession = true;
            try {
                if (!this.frpAuthStatus?.linked) {
                    this.showError('まずDiscordとリンクしてください');
                    return;
                }
                const remotePort = Number(this.frpForm.remotePort);
                const localPort = Number(this.frpForm.localPort);
                if (!Number.isInteger(remotePort) || !Number.isInteger(localPort)) {
                    this.showError('ポートが選択されていません');
                    return;
                }
                const payload = { remotePort, localPort };
                const res = await apiPost(API_ENDPOINTS.frp.sessions, payload);
                if (res.ok) {
                    this.showSuccess('公開を開始しました');
                    await this.refreshFrpOverview(true);
                    this.selectFrpServer(this.frpForm.selectedServerId); // 再度ポートを計算
                } else {
                    this.showError(res.error || '公開開始に失敗しました');
                }
            } catch (error) {
                this.showError(error.message);
            } finally {
                this.frpCreatingSession = false;
            }
        },

        async stopFrpSession(sessionId) {
            try {
                await apiDelete(API_ENDPOINTS.frp.session(sessionId));
                this.showSuccess('公開を停止しました');
                await this.refreshFrpOverview(true);
            } catch (error) {
                this.showError(error.message);
            }
        },

        async startFrpPublication(pub) {
            if (!pub) return;
            this.frpForm.selectedServerId = this.servers.find((s) => (s.launchConfig?.port || s.port || s.serverPort || s.Port) === pub.localPort)?.uuid || '';
            this.frpForm.localPort = pub.localPort;
            this.frpForm.remotePort = pub.remotePort;
            this.updateFrpPublicUrl();
            await this.createFrpSession();
        },

        async deleteFrpPublication(pub) {
            if (!pub) return;
            // backendには削除専用APIがないため、停止→UIから除外という扱いにする
            try {
                await this.stopFrpSession(pub.sessionId);
                this.frpSessions = (this.frpSessions || []).filter((s) => s.sessionId !== pub.sessionId);
                this.frpProcesses = (this.frpProcesses || []).filter((p) => p.sessionId !== pub.sessionId);
                this.buildFrpPublications();
            } catch (error) {
                this.showError(error.message);
            }
        },

        async fetchFrpLogs(sessionId, lines) {
            this.frpLogs.loading = true;
            this.frpLogs.error = '';
            this.frpLogs.sessionId = sessionId;
            try {
                const url = API_ENDPOINTS.frp.logs(sessionId, lines || this.frpLogs.lines || 200);
                const res = await apiGet(url);
                if (res.ok) {
                    this.frpLogs.entries = res.data || [];
                } else {
                    this.frpLogs.error = res.error || 'ログ取得に失敗しました';
                }
            } catch (error) {
                this.frpLogs.error = error.message;
            } finally {
                this.frpLogs.loading = false;
            }
        },

        openFrpLogModal(sessionId, title) {
            this.frpLogModal.visible = true;
            this.frpLogModal.sessionId = sessionId;
            this.frpLogModal.title = title || sessionId;
            this.frpLogModal.loading = true;
            this.frpLogModal.error = '';
            this.frpLogModal.entries = [];
            this.fetchFrpLogsForModal(sessionId, this.frpLogModal.lines);
        },

        async fetchFrpLogsForModal(sessionId, lines) {
            this.frpLogModal.loading = true;
            this.frpLogModal.error = '';
            try {
                const url = API_ENDPOINTS.frp.logs(sessionId, lines || this.frpLogModal.lines || 200);
                const res = await apiGet(url);
                if (res.ok) {
                    this.frpLogModal.entries = res.data || [];
                } else {
                    this.frpLogModal.error = res.error || 'ログ取得に失敗しました';
                }
            } catch (error) {
                this.frpLogModal.error = error.message;
            } finally {
                this.frpLogModal.loading = false;
            }
        },

        closeFrpLogModal() {
            this.frpLogModal.visible = false;
            this.frpLogModal.sessionId = null;
            this.frpLogModal.entries = [];
            this.frpLogModal.error = '';
        },

        startFrpPolling() {
            if (this.frpPollTimer) {
                clearInterval(this.frpPollTimer);
            }
            this.frpPollEnabled = true;
            this.frpPollTimer = setInterval(() => {
                this.refreshFrpOverview();
            }, 1000);
        },

        stopFrpPolling() {
            this.frpPollEnabled = false;
            if (this.frpPollTimer) {
                clearInterval(this.frpPollTimer);
                this.frpPollTimer = null;
            }
        },

        openFrpAuthUrl() {
            if (this.frpAuthStatus?.authUrl) {
                window.open(this.frpAuthStatus.authUrl, '_blank', 'noopener,noreferrer');
                // 多重認証防止のため、表示を消す
                this.frpAuthStatus.authUrl = null;
            }
        }
    };
}
