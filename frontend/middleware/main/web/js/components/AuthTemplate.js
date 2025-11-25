// Authentication Templates (Signup & Login)
export const authTemplate = `
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
`;

