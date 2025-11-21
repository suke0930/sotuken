// Dashboard Header Template
export const dashboardHeaderTemplate = `
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
`;

