// Vue Application Template
export const appTemplate = `
<div v-if="loading" id="loading-overlay">
    <div class="loading-spinner"></div>
    <p>読み込み中...</p>
</div>

<div v-else-if="!isAuthenticated">
    <section v-if="authMode === 'signup'" class="auth-container">
        <div class="auth-card">
            <div class="auth-icon">
                <i class="fas fa-user-plus"></i>
            </div>
            <div class="auth-header">
                <h2>ユーザー登録</h2>
                <p>このアプリケーションを使用するために、管理ユーザーを1名登録してください。</p>
            </div>
            <form @submit.prevent="handleSignup">
                <div class="form-group">
                    <label for="signup-id">ユーザーID</label>
                    <input
                        type="text"
                        id="signup-id"
                        v-model="signupForm.id"
                        required
                        placeholder="ユーザーIDを入力"
                    >
                </div>
                <div class="form-group">
                    <label for="signup-password">パスワード</label>
                    <input
                        type="password"
                        id="signup-password"
                        v-model="signupForm.password"
                        required
                        placeholder="パスワードを入力"
                    >
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-check-circle"></i>
                    登録して開始
                </button>
                <div v-if="authMessage" :class="['message', authMessageType]">
                    {{ authMessage }}
                </div>
                <p style="text-align: center; margin-top: 20px; color: var(--theme-text-secondary);">
                    既にアカウントをお持ちの方は
                    <a href="#" @click.prevent="authMode = 'login'" style="color: var(--theme-primary); font-weight: 600; text-decoration: none;">
                        こちらからログイン
                    </a>
                </p>
            </form>
        </div>
    </section>

    <section v-else class="auth-container">
        <div class="auth-card">
            <div class="auth-icon">
                <i class="fas fa-sign-in-alt"></i>
            </div>
            <div class="auth-header">
                <h2>ログイン</h2>
                <p>アカウント情報を入力してください</p>
            </div>
            <form @submit.prevent="handleLogin">
                <div class="form-group">
                    <label for="login-id">ユーザーID</label>
                    <input
                        type="text"
                        id="login-id"
                        v-model="loginForm.id"
                        required
                        placeholder="ユーザーIDを入力"
                    >
                </div>
                <div class="form-group">
                    <label for="login-password">パスワード</label>
                    <input
                        type="password"
                        id="login-password"
                        v-model="loginForm.password"
                        required
                        placeholder="パスワードを入力"
                    >
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i>
                    ログイン
                </button>
                <div v-if="authMessage" :class="['message', authMessageType]">
                    {{ authMessage }}
                </div>
                <p style="text-align: center; margin-top: 20px; color: var(--theme-text-secondary);">
                    アカウントをお持ちでない方は
                    <a href="#" @click.prevent="authMode = 'signup'" style="color: var(--theme-primary); font-weight: 600; text-decoration: none;">
                        こちらから新規登録
                    </a>
                </p>
            </form>
        </div>
    </section>
</div>

<main v-else class="main-wrapper">
    <nav class="navbar">
        <div class="navbar-content">
            <div style="display: flex; align-items: center;">
                <button @click="toggleSidebar" class="hamburger-menu">
                    <i class="fas fa-bars"></i>
                </button>
                <div class="navbar-brand">
                    <i class="fas fa-cubes"></i>
                    Minecraft Server Manager
                </div>
            </div>
            <div class="navbar-actions">
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

                <button @click="toggleTheme" class="theme-toggle" :title="darkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'">
                    <i v-if="darkMode" class="fas fa-sun" style="font-size: 14px;"></i>
                    <i v-else class="fas fa-moon" style="font-size: 14px;"></i>
                </button>
                <div class="user-menu-container" :class="{ open: userMenuOpen }" @click.stop="toggleUserMenu">
                    <div class="user-menu">
                        <div class="user-avatar">
                            <i class="fas fa-user" style="font-size: 12px;"></i>
                        </div>
                        <span>{{ username || '管理者' }}</span>
                        <i class="fas fa-chevron-down" style="font-size: 10px;"></i>
                    </div>
                    <div class="user-menu-dropdown">
                        <div class="user-menu-item" @click="handleLogout">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>ログアウト</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- Sidebar Overlay -->
    <div :class="['sidebar-overlay', { active: sidebarOpen }]" @click="closeSidebar"></div>

    <!-- Sidebar -->
    <aside :class="['sidebar', { open: sidebarOpen }]">
        <ul class="sidebar-menu">
            <li v-for="item in sidebarMenu" :key="item.id" class="sidebar-menu-item">
                <button
                    :class="['sidebar-menu-button', { active: activeTab === item.id }]"
                    @click="switchTab(item.id)"
                >
                    <i :class="item.icon"></i>
                    <span>{{ item.label }}</span>
                </button>
            </li>
        </ul>
    </aside>

    <div class="dashboard">
        <div class="dashboard-header">
            <h1 class="dashboard-title">サーバー管理ダッシュボード</h1>
            <p class="dashboard-subtitle">Minecraftサーバーの作成、管理、監視を行います</p>
        </div>

        <transition name="fade">
            <div v-if="errorMessage" class="message-area error">
                {{ errorMessage }}
            </div>
        </transition>
        <transition name="fade">
            <div v-if="successMessage" class="message-area success">
                {{ successMessage }}
            </div>
        </transition>

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

        <div v-show="activeTab === 'create'" class="content-section active">
            <div class="section-title">
                <i class="fas fa-plus-circle"></i>
                <span>{{ editingServer ? \`"\${editingServer.serverName}" を編集\` : '新しいMinecraftサーバーを作成' }}</span>
            </div>

            <form @submit.prevent="handleServerSubmit">
                <div class="form-row">
                    <div class="form-group">
                        <label for="serverName">
                            <i class="fas fa-tag"></i>
                            サーバー名 <span style="color: red;">*</span>
                            <button type="button" class="help-icon" @click="openHelpModal('serverName')" title="ヘルプを表示">
                                <i class="fas fa-question-circle"></i>
                            </button>
                        </label>
                        <input
                            type="text"
                            id="serverName"
                            v-model="serverForm.serverName"
                            @blur="checkServerNameAvailability(serverForm.serverName)"
                            required
                            placeholder="例: My Minecraft Server"
                        >
                        <div v-if="serverNameWarning" style="margin-top: 8px; color: #ef4444; font-size: 13px;">
                            <i class="fas fa-exclamation-triangle"></i> {{ serverNameWarning }}
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="note">
                            <i class="fas fa-sticky-note"></i>
                            メモ
                        </label>
                        <textarea
                            id="note"
                            v-model="serverForm.note"
                            placeholder="ここにメモを記述..."
                            style="min-height: 80px; resize: vertical; font-family: inherit;"
                        ></textarea>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="serverSoftware">
                            <i class="fas fa-cogs"></i>
                            サーバーソフトウェアを選択 <span style="color: red;">*</span>
                            <button type="button" class="help-icon" @click="openHelpModal('serverSoftware')" title="ヘルプを表示">
                                <i class="fas fa-question-circle"></i>
                            </button>
                        </label>
                        <select
                            id="serverSoftware"
                            v-model="serverForm.serverSoftware"
                            required
                            :disabled="isFetchingServerList || serverSoftwareFetchFailed"
                        >
                            <option value="">{{ serverSoftwarePlaceholder }}</option>
                            <option
                                v-for="option in serverSoftwareOptions"
                                :key="option.value"
                                :value="option.value"
                            >
                                {{ option.label }}
                            </option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="minecraftVersion">
                            <i class="fas fa-code-branch"></i>
                            Minecraftバージョンを選択 <span style="color: red;">*</span>
                        </label>
                        <select
                            id="minecraftVersion"
                            v-model="serverForm.minecraftVersion"
                            :disabled="isFetchingServerList || serverSoftwareFetchFailed || !serverForm.serverSoftware || loadingVersions || availableVersions.length === 0"
                            required
                        >
                            <option value="">{{ minecraftVersionPlaceholder }}</option>
                            <option
                                v-for="version in availableVersions"
                                :key="version.version"
                                :value="version.version"
                            >
                                {{ version.version }}
                            </option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="jdkVersion">
                            <i class="fas fa-coffee"></i>
                            JDKバージョン (自動選択) <span style="color: red;">*</span>
                        </label>
                        <input
                            type="text"
                            id="jdkVersion"
                            v-model="serverForm.jdkVersion"
                            :disabled="isFetchingServerList || serverSoftwareFetchFailed || !serverForm.minecraftVersion"
                            :placeholder="serverForm.minecraftVersion ? '' : 'バージョン選択後に自動設定されます'"
                            readonly
                            style="background: var(--theme-bg); cursor: not-allowed;"
                        >
                        <div v-if="requiredJdkVersion" style="margin-top: 8px;">
                            <span v-if="jdkCheckLoading" style="color: var(--theme-text-secondary); font-size: 13px;">
                                <i class="fas fa-spinner fa-spin"></i> チェック中...
                            </span>
                            <span v-else-if="jdkInstalled" style="color: #22c55e; font-size: 13px;">
                                <i class="fas fa-check-circle"></i> JDK {{ requiredJdkVersion }} はインストール済みです
                            </span>
                            <span v-else style="color: #f59e0b; font-size: 13px;">
                                <i class="fas fa-info-circle"></i> JDK {{ requiredJdkVersion }} は未インストール (自動でインストールされます)
                            </span>
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="port">
                            <i class="fas fa-network-wired"></i>
                            ポート番号 <span style="color: red;">*</span>
                        </label>
                        <input
                            type="number"
                            id="port"
                            v-model.number="serverForm.port"
                            required
                            min="1024"
                            max="65535"
                            placeholder="25565"
                        >
                        <div v-if="portWarning" style="margin-top: 8px; color: #ef4444; font-size: 13px;">
                            <i class="fas fa-exclamation-triangle"></i> {{ portWarning }}
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="minMemory">
                            <i class="fas fa-memory"></i>
                            最小メモリ (MB)
                        </label>
                        <input
                            type="number"
                            id="minMemory"
                            v-model.number="serverForm.minMemory"
                            required
                            min="256"
                            placeholder="512"
                        >
                    </div>
                    <div class="form-group">
                        <label for="maxMemory">
                            <i class="fas fa-memory"></i>
                            最大メモリ (MB)
                            <button type="button" class="help-icon" @click="openHelpModal('maxMemory')" title="ヘルプを表示">
                                <i class="fas fa-question-circle"></i>
                            </button>
                        </label>
                        <input
                            type="number"
                            id="maxMemory"
                            v-model.number="serverForm.maxMemory"
                            required
                            min="512"
                            placeholder="1024"
                        >
                    </div>
                </div>

                <!-- Operations Preview -->
                <div v-if="isFormValid && !editingServer" style="background: var(--theme-surface); border: 2px solid var(--theme-primary); border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <h4 style="color: var(--theme-text); margin-bottom: 16px; font-size: 16px;">
                        <i class="fas fa-list-check" style="color: var(--theme-primary);"></i>
                        これから行われる操作:
                    </h4>
                    <ol style="margin: 0; padding-left: 24px; color: var(--theme-text-secondary); line-height: 1.8;">
                        <li v-if="!jdkInstalled && requiredJdkVersion">
                            JDK {{ requiredJdkVersion }} のダウンロード
                        </li>
                        <li v-if="!jdkInstalled && requiredJdkVersion">
                            JDK {{ requiredJdkVersion }} のインストール
                        </li>
                        <li>サーバー "{{ serverForm.serverSoftware }}-{{ serverForm.minecraftVersion }}.jar" のダウンロード</li>
                        <li>インスタンス "{{ serverForm.serverName }}" の作成</li>
                    </ol>
                </div>

                <button type="submit" :class="['btn', editingServer ? 'btn-secondary' : 'btn-primary']" :disabled="!isFormValid && !editingServer">
                    <i :class="formSubmitting ? 'fas fa-spinner fa-spin' : (editingServer ? 'fas fa-save' : 'fas fa-rocket')"></i>
                    {{ editingServer ? 'サーバーを更新' : 'サーバーを作成' }}
                </button>
            </form>
        </div>

        <div v-show="activeTab === 'settings'" class="content-section active">
            <div class="section-title">
                <i class="fas fa-cogs"></i>
                システム設定
            </div>

            <div style="background: var(--theme-bg); padding: 24px; border-radius: 16px; margin-bottom: 24px;">
                <h4 style="color: var(--theme-text); margin-bottom: 16px; font-size: 18px;">
                    <i class="fas fa-shield-alt" style="color: var(--theme-primary);"></i>
                    保護されたAPI テスト
                </h4>
                <p style="color: var(--theme-text-secondary); margin-bottom: 20px; line-height: 1.6;">
                    ログイン状態でのみアクセス可能なAPIエンドポイントをテストします。<br>
                    認証システムが正常に動作していることを確認できます。
                </p>
                <button @click="testProtectedApi" class="btn btn-success">
                    <i class="fas fa-flask"></i>
                    /api/protected をテスト
                </button>
            </div>

            <div style="background: var(--theme-surface); border: 2px solid var(--theme-border); border-radius: 16px; padding: 20px;">
                <h5 style="color: var(--theme-text); margin-bottom: 12px;">
                    <i class="fas fa-terminal" style="color: var(--theme-primary);"></i>
                    APIレスポンス
                </h5>
                <pre style="
                    background: #1f2937;
                    color: #e5e7eb;
                    padding: 20px;
                    border-radius: 12px;
                    font-family: 'Monaco', 'Consolas', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    min-height: 60px;
                    overflow-x: auto;
                ">{{ apiResponse }}</pre>
            </div>
        </div>

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

        <div v-show="activeTab === 'about'" class="content-section active">
            <div class="section-title">
                <i class="fas fa-info-circle"></i>
                About Us
            </div>
            
            <div class="markdown-content-container">
                <div v-html="aboutUsRendered" class="content-page-markdown"></div>
            </div>
        </div>

        <div v-show="activeTab === 'tutorials'" class="content-section active">
            <div class="section-title">
                <i class="fas fa-book"></i>
                チュートリアル
            </div>
            
            <div class="markdown-content-container">
                <div v-html="tutorialsRendered" class="content-page-markdown"></div>
            </div>
        </div>

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
    </div>

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
</main>
`;
