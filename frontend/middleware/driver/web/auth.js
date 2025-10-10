// 認証状態管理
const AUTH_API = {
    signup: '/user/signup',
    login: '/user/login',
    auth: '/user/auth',
    logout: '/user/logout'
};

// ページ読み込み時に認証状態をチェック
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthStatus();
});

// 認証状態チェック
async function checkAuthStatus() {
    try {
        const response = await fetch(AUTH_API.auth, {
            method: 'GET',
            credentials: 'include'
        });
        const data = await response.json();

        if (data.ok && data.userId) {
            // 認証済み → メインコンテンツを表示
            showMainContent(data.userId);
        } else if (data.reason === 'no_user_registered') {
            // ユーザー未登録 → サインアップ画面
            showSignupSection();
        } else {
            // 未認証 → ログイン画面
            showLoginSection();
        }
    } catch (error) {
        console.error('認証チェックエラー:', error);
        showLoginSection();
    }
}

// サインアップ画面表示
function showSignupSection() {
    hideLoading();
    document.getElementById('signup-section').style.display = 'block';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'none';
}

// ログイン画面表示
function showLoginSection() {
    hideLoading();
    document.getElementById('signup-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
}

// メインコンテンツ表示
function showMainContent(userId) {
    hideLoading();
    document.getElementById('signup-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('user-display-name').textContent = userId;

    // サーバー一覧を読み込み
    if (window.loadServers) {
        window.loadServers();
    }
}

// ローディング非表示
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// サインアップフォーム送信
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: formData.get('id'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(AUTH_API.signup, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.ok) {
            showMainContent(result.userId);
        } else {
            showMessage('signup-message', result.message, 'error');
        }
    } catch (error) {
        console.error('サインアップエラー:', error);
        showMessage('signup-message', 'サーバーエラーが発生しました', 'error');
    }
});

// ログインフォーム送信
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        id: formData.get('id'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(AUTH_API.login, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.ok) {
            showMainContent(result.userId);
        } else {
            showMessage('login-message', result.message, 'error');
        }
    } catch (error) {
        console.error('ログインエラー:', error);
        showMessage('login-message', 'サーバーエラーが発生しました', 'error');
    }
});

// ログアウト
document.getElementById('logout-button')?.addEventListener('click', async () => {
    try {
        await fetch(AUTH_API.logout, {
            method: 'POST',
            credentials: 'include'
        });
        location.reload();
    } catch (error) {
        console.error('ログアウトエラー:', error);
    }
});

// メッセージ表示ヘルパー
function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = `message ${type}`;
        el.style.display = 'block';
    }
}