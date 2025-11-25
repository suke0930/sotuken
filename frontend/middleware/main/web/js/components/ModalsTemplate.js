// Modals Template (Creation, Update, Console, Delete JDK, Help)
export const modalsTemplate = `
<!-- Server Creation Modal -->
<div v-if="creationModal.visible" class="modal-overlay" @click.self="closeCreationModal">
    <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
            <h3>
                <i class="fas fa-cog fa-spin" v-if="creationModal.status === 'running'"></i>
                <i class="fas fa-check-circle" v-else-if="creationModal.status === 'success'" style="color: #22c55e;"></i>
                <i class="fas fa-exclamation-circle" v-else style="color: #ef4444;"></i>
                サーバー作成
            </h3>
            <button class="modal-close" @click="closeCreationModal" v-if="creationModal.canClose">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="modal-body">
            <!-- Operations List -->
            <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px; color: var(--theme-text);">
                    <i class="fas fa-list"></i> 実行する操作
                </h4>
                <div v-for="(op, index) in creationModal.operations" :key="op.id"
                     style="padding: 12px; background: var(--theme-surface); border-radius: 8px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;"
                             :style="{
                                 background: op.status === 'completed' ? '#22c55e' : op.status === 'running' ? '#3b82f6' : '#6b7280',
                                 color: 'white'
                             }">
                            <i class="fas fa-check" v-if="op.status === 'completed'"></i>
                            <i class="fas fa-spinner fa-spin" v-else-if="op.status === 'running'"></i>
                            <span v-else>{{ index + 1 }}</span>
                        </div>
                        <div style="flex: 1;">
                            <div style="color: var(--theme-text); font-weight: 500;">{{ op.label }}</div>
                            <div v-if="op.message" style="color: var(--theme-text-secondary); font-size: 12px; margin-top: 4px;">
                                {{ op.message }}
                            </div>
                        </div>
                    </div>
                    <!-- Progress Bar for Downloads -->
                    <div v-if="op.status === 'running' && op.progress !== undefined" style="margin-top: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="font-size: 11px; color: var(--theme-text-secondary);">ダウンロード進捗</span>
                            <span style="font-size: 11px; color: var(--theme-primary); font-weight: 600;">{{ op.progress }}%</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: var(--theme-bg); border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; background: linear-gradient(90deg, var(--theme-primary), #4CAF50); transition: width 0.3s ease;"
                                 :style="{ width: op.progress + '%' }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Bar -->
            <div style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--theme-text); font-weight: 500;">進捗</span>
                    <span style="color: var(--theme-primary); font-weight: 600;">{{ creationModal.progress }}%</span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--theme-bg); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; background: var(--theme-primary); transition: width 0.3s ease;"
                         :style="{ width: creationModal.progress + '%' }"></div>
                </div>
            </div>

            <!-- Logs -->
            <div ref="creationLogsContainer" style="background: #1f2937; border-radius: 8px; padding: 16px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;">
                <div v-for="(log, index) in creationModal.logs" :key="index"
                     style="margin-bottom: 4px; color: #e5e7eb;">
                    <span style="color: #9ca3af;">[{{ log.timestamp }}]</span>
                    <span :style="{ color: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#22c55e' : '#e5e7eb' }">
                        {{ log.message }}
                    </span>
                </div>
            </div>

            <!-- Status Message -->
            <div v-if="creationModal.message"
                 style="margin-top: 16px; padding: 12px; border-radius: 8px; text-align: center; font-weight: 500;"
                 :style="{
                     background: creationModal.status === 'success' ? '#dcfce7' : '#fee2e2',
                     color: creationModal.status === 'success' ? '#166534' : '#991b1b'
                 }">
                {{ creationModal.message }}
            </div>
        </div>

        <div class="modal-footer" v-if="creationModal.canClose">
            <button class="btn btn-secondary" @click="closeCreationModal" v-if="creationModal.status === 'success'">
                <i class="fas fa-check"></i> 閉じる
            </button>
            <button class="btn btn-danger" @click="closeCreationModal" v-if="creationModal.status === 'error'">
                <i class="fas fa-times"></i> 閉じる
            </button>
            <button class="btn btn-primary" @click="retryServerCreation" v-if="creationModal.status === 'error'">
                <i class="fas fa-redo"></i> 再試行
            </button>
        </div>
    </div>
</div>

<!-- Server Update Modal -->
<div v-if="updateModal.visible" class="modal-overlay" @click.self="closeUpdateModal">
    <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
            <h3>
                <i class="fas fa-edit"></i>
                サーバー設定を編集 - {{ updateModal.server?.name }}
            </h3>
            <button class="modal-close" @click="closeUpdateModal">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="modal-body">
            <div class="form-group">
                <label>
                    <i class="fas fa-tag"></i>
                    サーバー名
                </label>
                <input
                    type="text"
                    v-model="updateModal.form.name"
                    placeholder="サーバー名"
                />
            </div>

            <div class="form-group">
                <label>
                    <i class="fas fa-sticky-note"></i>
                    メモ
                </label>
                <textarea
                    v-model="updateModal.form.note"
                    placeholder="メモを記述..."
                    style="min-height: 80px; resize: vertical;"
                ></textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>
                        <i class="fas fa-network-wired"></i>
                        ポート番号
                    </label>
                    <input
                        type="number"
                        v-model.number="updateModal.form.port"
                        min="1024"
                        max="65535"
                    />
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>
                        <i class="fas fa-memory"></i>
                        最小メモリ (MB)
                    </label>
                    <input
                        type="number"
                        v-model.number="updateModal.form.minMemory"
                        min="256"
                    />
                </div>
                <div class="form-group">
                    <label>
                        <i class="fas fa-memory"></i>
                        最大メモリ (MB)
                    </label>
                    <input
                        type="number"
                        v-model.number="updateModal.form.maxMemory"
                        min="512"
                    />
                </div>
            </div>

            <div class="form-group">
                <label>
                    <i class="fas fa-code"></i>
                    JVM Arguments
                </label>
                <input
                    type="text"
                    v-model="updateModal.form.jvmArguments"
                    placeholder="-XX:+UseG1GC -XX:MaxGCPauseMillis=200"
                />
            </div>

            <div class="form-group">
                <label>
                    <i class="fas fa-terminal"></i>
                    Server Arguments
                </label>
                <input
                    type="text"
                    v-model="updateModal.form.serverArguments"
                    placeholder="--nogui --world world"
                />
            </div>

            <div class="form-group">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input
                        type="checkbox"
                        v-model="updateModal.form.autoRestart"
                        style="margin-right: 8px; cursor: pointer;"
                    />
                    <span>自動再起動を有効化</span>
                </label>
            </div>

            <div v-if="updateModal.form.autoRestart" class="form-row">
                <div class="form-group">
                    <label>最大連続再起動回数</label>
                    <input
                        type="number"
                        v-model.number="updateModal.form.maxConsecutiveRestarts"
                        min="1"
                        max="10"
                    />
                </div>
                <div class="form-group">
                    <label>リセット時間 (秒)</label>
                    <input
                        type="number"
                        v-model.number="updateModal.form.resetThresholdSeconds"
                        min="60"
                    />
                </div>
            </div>

            <div v-if="updateModal.error" style="margin-top: 16px; padding: 12px; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
                <p style="color: #991b1b; margin: 0;">
                    <i class="fas fa-exclamation-circle"></i>
                    {{ updateModal.error }}
                </p>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeUpdateModal">
                <i class="fas fa-times"></i>
                キャンセル
            </button>
            <button class="btn btn-primary" @click="submitServerUpdate">
                <i class="fas fa-save"></i>
                保存
            </button>
        </div>
    </div>
</div>

<!-- JDK Delete Confirmation Modal -->
<div v-if="showDeleteJdkModal" class="modal-overlay" @click.self="cancelDeleteJdk">
    <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
            <h3>
                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                JDKの削除確認
            </h3>
            <button class="modal-close" @click="cancelDeleteJdk">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="modal-body">
            <p style="color: var(--theme-text); margin-bottom: 16px; line-height: 1.6;">
                以下のJDKを削除してもよろしいですか？この操作は取り消せません。
            </p>
            <div style="background: var(--theme-bg); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--theme-text);">バージョン:</strong>
                    <span style="color: var(--theme-text-secondary); margin-left: 8px;">JDK {{ jdkToDelete?.majorVersion }}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <strong style="color: var(--theme-text);">ID:</strong>
                    <span style="color: var(--theme-text-secondary); margin-left: 8px; font-family: monospace; font-size: 12px;">{{ jdkToDelete?.id }}</span>
                </div>
                <div>
                    <strong style="color: var(--theme-text);">パス:</strong>
                    <span style="color: var(--theme-text-secondary); margin-left: 8px; font-size: 12px; word-break: break-all;">{{ jdkToDelete?.structName }}</span>
                </div>
            </div>
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px;">
                <p style="color: #991b1b; font-size: 14px; margin: 0;">
                    <i class="fas fa-exclamation-circle"></i>
                    JDKファイルが完全に削除されます。この操作は元に戻せません。
                </p>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn btn-secondary" @click="cancelDeleteJdk">
                <i class="fas fa-times"></i> キャンセル
            </button>
            <button class="btn btn-danger" @click="deleteJdk">
                <i class="fas fa-trash"></i> 削除する
            </button>
        </div>
    </div>
</div>

<!-- Server Console Modal -->
<div v-if="consoleModal.visible" class="modal-overlay" @click.self="closeConsole">
    <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
        <div class="modal-header">
            <h3>
                <i class="fas fa-terminal"></i>
                サーバーコンソール - {{ consoleModal.serverName }}
            </h3>
            <button class="modal-close" @click="closeConsole">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="modal-body" style="padding: 0;">
            <!-- Controls -->
            <div class="console-controls">
                <div class="console-status">
                    <div :class="['console-status-indicator', { stopped: !consoleModal.isServerRunning }]"></div>
                    <span>{{ consoleModal.isServerRunning ? 'サーバー稼働中' : 'サーバー停止中' }}</span>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button @click="toggleTimestampDisplay" class="btn btn-sm btn-secondary" title="タイムスタンプとログレベルの表示/非表示">
                        <i :class="consoleModal.showTimestamp ? 'fas fa-eye' : 'fas fa-eye-slash'"></i>
                        タイムスタンプ
                    </button>
                    <button @click="clearServerLogs" class="btn btn-sm btn-danger" title="ログをクリア">
                        <i class="fas fa-trash"></i>
                        ログクリア
                    </button>
                    <label class="console-toggle-autoscroll" @click="toggleAutoScroll">
                        <input type="checkbox" :checked="consoleModal.autoScroll" class="console-toggle-checkbox" />
                        自動スクロール
                    </label>
                </div>
            </div>

            <!-- Log Count Info -->
            <div v-if="consoleModal.totalLogCount > 0" style="padding: 8px 16px; background: var(--theme-surface); border-bottom: 1px solid var(--theme-border); font-size: 12px; color: var(--theme-text-secondary);">
                <i class="fas fa-info-circle"></i>
                表示中: {{ consoleModal.logs.length }} 行
                <span v-if="consoleModal.totalLogCount > consoleModal.logs.length">
                    / サーバー保存: {{ consoleModal.totalLogCount }} 行
                </span>
            </div>

            <!-- Terminal -->
            <div class="console-terminal" @scroll="handleTerminalScroll">
                <div
                    v-for="log in consoleModal.logs"
                    :key="log.id"
                    :class="['console-log-line', log.type]"
                >{{ formatLogLine(log) }}</div>
            </div>

            <!-- Server Offline Message -->
            <div v-if="!consoleModal.isServerRunning" class="console-server-offline">
                <i class="fas fa-power-off"></i>
                <h4>サーバーは現在停止しています</h4>
                <p>コマンドを送信するにはサーバーを起動してください</p>
            </div>

            <!-- Input Area -->
            <div class="console-input-area" style="padding: 16px; background: var(--theme-bg); border-top: 1px solid var(--theme-border);">
                <input
                    type="text"
                    v-model="consoleModal.command"
                    @keydown="handleConsoleKeydown"
                    :disabled="!consoleModal.isServerRunning"
                    class="console-input"
                    placeholder="コマンドを入力... (Enterで送信)"
                />
                <button
                    @click="sendConsoleCommand"
                    :disabled="!consoleModal.isServerRunning || !consoleModal.command.trim()"
                    class="btn btn-primary"
                >
                    <i class="fas fa-paper-plane"></i>
                    送信
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Help Modal -->
<div v-if="helpModal.visible" class="modal-overlay" @click.self="closeHelpModal">
    <div class="modal-content help-modal" style="max-width: 800px; max-height: 85vh; overflow-y: auto;">
        <div class="modal-header">
            <h3>
                <i class="fas fa-question-circle" style="color: var(--theme-primary);"></i>
                {{ helpModal.title }}
            </h3>
            <button class="modal-close" @click="closeHelpModal">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="modal-body help-modal-body">
            <div v-html="helpModal.content" class="help-content"></div>
        </div>

        <div class="modal-footer">
            <button class="btn btn-primary" @click="closeHelpModal">
                <i class="fas fa-check"></i>
                閉じる
            </button>
        </div>
    </div>
</div>
`;

