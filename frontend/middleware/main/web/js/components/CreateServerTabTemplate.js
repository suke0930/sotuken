// Create/Edit Server Tab Template
export const createServerTabTemplate = `
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
`;

