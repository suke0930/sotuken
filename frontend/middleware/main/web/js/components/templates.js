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
                    <div :class="['server-status', server.status === 'running' ? 'running' : 'stopped']">
                        {{ server.status === 'running' ? '🟢 稼働中' : '🔴 停止中' }}
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
                            v-if="server.status === 'stopped'"
                            class="btn btn-success btn-sm"
                            @click="startServer(server)"
                        >
                            <i class="fas fa-play"></i>
                            起動
                        </button>
                        <button
                            v-else
                            class="btn btn-danger btn-sm"
                            @click="stopServer(server)"
                        >
                            <i class="fas fa-stop"></i>
                            停止
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
                        </label>
                        <input
                            type="text"
                            id="serverName"
                            v-model="serverForm.serverName"
                            required
                            placeholder="例: My Minecraft Server"
                        >
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
                            <div class="download-progress-bar" :style="{ width: download.percentage + '%' }"></div>
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
                                <span class="download-info-value">{{ (download.speed / 1024).toFixed(2) }} KB/s</span>
                            </div>
                            <div class="download-info-item">
                                <span class="download-info-label">残り時間</span>
                                <span class="download-info-value">
                                    {{ download.remainingTime > 0 ? formatTime(download.remainingTime) : '--' }}
                                </span>
                            </div>
                            <div class="download-info-item">
                                <button
                                    v-if="download.status === 'downloading'"
                                    @click="cancelDownload(download.taskId)"
                                    class="btn btn-danger btn-sm"
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
            <div class="empty-state">
                <i class="fas fa-info-circle"></i>
                <h3>About Us</h3>
                <p>このセクションは準備中です。</p>
            </div>
        </div>

        <div v-show="activeTab === 'tutorials'" class="content-section active">
            <div class="section-title">
                <i class="fas fa-book"></i>
                Tutorials
            </div>
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <h3>Tutorials</h3>
                <p>このセクションは準備中です。</p>
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
                         style="padding: 12px; background: var(--theme-surface); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
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
                <div style="background: #1f2937; border-radius: 8px; padding: 16px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;">
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
</main>
`;
