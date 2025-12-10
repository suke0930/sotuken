// Settings Tab Template
export const settingsTabTemplate = `
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
`;

