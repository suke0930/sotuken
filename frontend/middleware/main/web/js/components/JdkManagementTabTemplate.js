// JDK Management Tab Template
export const jdkManagementTabTemplate = `
<div v-show="activeTab === 'jdk-management'" class="content-section active">
    <div class="section-title">
        <i class="fas fa-coffee"></i>
        JDK管理
    </div>

    <div v-if="jdkManagementLoading" class="empty-state">
        <i class="fas fa-spinner fa-spin" style="font-size: 36px; color: var(--theme-primary);"></i>
        <h3>インストール済みJDKを読み込み中...</h3>
        <p>少々お待ちください</p>
    </div>

    <div v-else-if="installedJdks.length === 0" class="empty-state">
        <i class="fas fa-coffee"></i>
        <h3>インストール済みJDKがありません</h3>
        <p>サーバー作成時に必要なJDKが自動的にインストールされます。</p>
    </div>

    <div v-else style="max-width: 1200px; margin: 0 auto;">
        <div style="background: var(--theme-surface); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <h3 style="color: var(--theme-text); margin-bottom: 12px; font-size: 18px;">
                <i class="fas fa-info-circle" style="color: var(--theme-primary);"></i>
                JDK管理について
            </h3>
            <p style="color: var(--theme-text-secondary); line-height: 1.6; margin-bottom: 12px;">
                インストール済みのJava Development Kit (JDK) を管理できます。
                サーバーで使用中のJDKは削除できません。
            </p>
            <div style="display: flex; align-items: center; gap: 16px; margin-top: 16px;">
                <button @click="loadInstalledJdks" class="btn btn-secondary">
                    <i class="fas fa-sync-alt"></i>
                    リストを更新
                </button>
                <span style="color: var(--theme-text-secondary); font-size: 14px;">
                    インストール数: {{ installedJdks.length }} 件
                </span>
            </div>
        </div>

        <div class="servers-grid">
            <div
                v-for="jdk in installedJdks"
                :key="jdk.id"
                class="server-card"
            >
                <div class="server-name" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <i class="fas fa-coffee" style="color: var(--theme-primary); margin-right: 8px;"></i>
                        JDK {{ jdk.majorVersion }}
                    </div>
                    <div v-if="isJdkInUse(jdk.majorVersion)" style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                        <i class="fas fa-check-circle"></i> 使用中
                    </div>
                </div>

                <div class="server-details">
                    <div class="server-detail">
                        <span class="server-detail-label">
                            <i class="fas fa-hashtag"></i> ID
                        </span>
                        <span class="server-detail-value" style="font-family: monospace; font-size: 12px;">{{ jdk.id }}</span>
                    </div>
                    <div class="server-detail">
                        <span class="server-detail-label">
                            <i class="fas fa-code-branch"></i> メジャーバージョン
                        </span>
                        <span class="server-detail-value">{{ jdk.majorVersion }}</span>
                    </div>
                    <div class="server-detail">
                        <span class="server-detail-label">
                            <i class="fas fa-folder"></i> 正式名称
                        </span>
                        <span class="server-detail-value" style="font-size: 12px; word-break: break-all;">
                            {{ jdk.structName }}
                        </span>
                    </div>
                    <div class="server-detail" v-if="jdk.size">
                        <span class="server-detail-label">
                            <i class="fas fa-hdd"></i> サイズ
                        </span>
                        <span class="server-detail-value">{{ formatFileSize(jdk.size) }}</span>
                    </div>
                    <div v-if="isJdkInUse(jdk.majorVersion)" class="server-detail" style="grid-column: 1 / -1;">
                        <span class="server-detail-label">
                            <i class="fas fa-server"></i> 使用中のサーバー
                        </span>
                        <span class="server-detail-value">
                            {{ getServersUsingJdk(jdk.majorVersion).map(s => s.name).join(', ') }}
                        </span>
                    </div>
                </div>

                <div class="server-actions">
                    <button
                        class="btn btn-danger btn-sm"
                        @click="confirmDeleteJdk(jdk)"
                        :disabled="isJdkInUse(jdk.majorVersion)"
                        :title="isJdkInUse(jdk.majorVersion) ? 'このJDKは使用中のため削除できません' : 'このJDKを削除します'"
                    >
                        <i class="fas fa-trash"></i>
                        削除
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
`;

