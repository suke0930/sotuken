# テンプレートに追加するコード

## 1. ナビゲーションバーの通知アイコン（navbar-actionsの中、theme-toggleの前に追加）

```html
<!-- Notifications -->
<div class="notification-container" @click.stop>
    <div class="notification-badge" @click="toggleNotificationPanel">
        <i class="fas fa-bell"></i>
        <span v-if="unreadNotificationCount > 0" class="notification-count">
            {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
        </span>
    </div>

    <!-- Notification Panel -->
    <div v-if="showNotificationPanel" class="notification-panel">
        <div class="notification-header">
            <h3>通知</h3>
            <div class="notification-actions">
                <button class="notification-action-btn" @click="markAllNotificationsAsRead" v-if="unreadNotificationCount > 0">
                    すべて既読
                </button>
                <button class="notification-action-btn" @click="clearAllNotifications" v-if="notifications.length > 0">
                    すべて削除
                </button>
            </div>
        </div>

        <div class="notification-list" v-if="notifications.length > 0">
            <div
                v-for="notification in notifications"
                :key="notification.id"
                :class="['notification-item', { unread: !notification.read }]"
                @click="markNotificationAsRead(notification.id)"
            >
                <div class="notification-item-header">
                    <span class="notification-item-title">{{ notification.title }}</span>
                    <span class="notification-item-time">
                        {{ new Date(notification.timestamp).toLocaleTimeString() }}
                    </span>
                </div>
                <div class="notification-item-message">{{ notification.message }}</div>
                <div class="notification-item-actions">
                    <button class="notification-item-action" @click.stop="clearNotification(notification.id)">
                        削除
                    </button>
                </div>
            </div>
        </div>

        <div class="notification-empty" v-else>
            <i class="fas fa-bell-slash"></i>
            <p>通知はありません</p>
        </div>
    </div>
</div>
```

## 2. トーストコンテナ（</main>の直前に追加）

```html
<!-- Toast Notifications -->
<div class="toast-container">
    <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', toast.type]"
        @click="removeToast(toast.id)"
    >
        <div class="toast-icon">
            <i class="fas fa-check-circle" v-if="toast.type === 'success'"></i>
            <i class="fas fa-exclamation-circle" v-else-if="toast.type === 'error'"></i>
            <i class="fas fa-exclamation-triangle" v-else-if="toast.type === 'warning'"></i>
            <i class="fas fa-info-circle" v-else></i>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
    </div>
</div>
```

## 3. コンソールモーダル（</main>の直前、トーストの前に追加）

```html
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
                <label class="console-toggle-autoscroll" @click="toggleAutoScroll">
                    <input type="checkbox" :checked="consoleModal.autoScroll" class="console-toggle-checkbox" />
                    自動スクロール
                </label>
            </div>

            <!-- Terminal -->
            <div class="console-terminal" @scroll="handleTerminalScroll">
                <div
                    v-for="log in consoleModal.logs"
                    :key="log.id"
                    :class="['console-log-line', log.type]"
                >{{ log.line }}</div>
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
```

## 4. サーバー更新モーダル（既存の更新モーダルを置き換え、line 919-1107）

```html
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
```

## テンプレート追加手順

1. navbar-actionsに通知アイコンを追加（theme-toggleの前）
2. 既存のサーバー更新モーダル（919-1107行）を新しいものに置き換え
3. </main>の直前にコンソールモーダルとトーストコンテナを追加
