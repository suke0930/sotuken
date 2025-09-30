/**
 * 認証状態を管理し、UIを更新するためのスクリプト
 */

const API_BASE = ''; // 同一オリジンのため空

const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const mainContent = document.getElementById('main-content');
const loadingOverlay = document.getElementById('loading-overlay');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutButton = document.getElementById('logout-button');

const loginMessage = document.getElementById('login-message');
const signupMessage = document.getElementById('signup-message');

const testProtectedApiButton = document.getElementById('test-protected-api');
const apiResponseArea = document.getElementById('api-response');

/**
 * APIリクエストを送信する共通関数
 * @param {string} endpoint APIエンドポイント
 * @param {RequestInit} options fetchのオプション
 * @returns {Promise<any>} JSONレスポンス
 */
async function fetchApi(endpoint, options = {}) {
    // この関数はapp.jsからも利用される
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok && response.status !== 401 && response.status !== 409) {
            // 401, 409は業務エラーとして扱う
            throw new Error(`API request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        // グローバルなエラー表示など
        alert('サーバーとの通信に失敗しました。');
        throw error;
    }
}
// グローバルスコープに公開
window.fetchApi = fetchApi;

/**
 * UIの状態を切り替える
 * @param {'login' | 'signup' | 'main' | 'loading'} state 表示する状態
 */
function setUIState(state) {
    loginSection.style.display = 'none';
    signupSection.style.display = 'none';
    mainContent.style.display = 'none';
    loadingOverlay.style.display = 'flex'; // デフォルトはローディング表示

    switch (state) {
        case 'login':
            loginSection.style.display = 'block';
            loadingOverlay.style.display = 'none';
            break;
        case 'signup':
            signupSection.style.display = 'block';
            loadingOverlay.style.display = 'none';
            break;
        case 'main':
            mainContent.style.display = 'block';
            loadingOverlay.style.display = 'none';
            break;
        case 'loading':
        default:
            // ローディング表示のまま
            break;
    }
}

/**
 * 認証状態を確認し、適切なUIを表示する
 */
async function checkAuthStatus() {
    setUIState('loading');
    const data = await fetchApi('/user/auth');

    if (data.ok) {
        console.log('Authenticated:', data.userId);
        setUIState('main');
        // 認証後のメインコンテンツ初期化処理を呼び出す
        if (window.initializeApp) window.initializeApp();
    } else {
        if (data.reason === 'no_user_registered') {
            console.log('No user registered. Showing signup form.');
            setUIState('signup');
        } else {
            console.log('Not authenticated. Showing login form.');
            setUIState('login');
        }
    }
}

// --- イベントリスナーの設定 ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMessage.textContent = '';
    const formData = new FormData(loginForm);
    const id = formData.get('id');
    const password = formData.get('password');

    const data = await fetchApi('/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
    });

    if (data.ok) {
        await checkAuthStatus(); // 認証成功後、メイン画面に遷移
    } else {
        loginMessage.textContent = data.message || 'ログインに失敗しました。';
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupMessage.textContent = '';
    const formData = new FormData(signupForm);
    const id = formData.get('id');
    const password = formData.get('password');

    const data = await fetchApi('/user/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password }),
    });

    if (data.ok) {
        await checkAuthStatus(); // 登録・ログイン成功後、メイン画面に遷移
    } else {
        signupMessage.textContent = data.message || 'ユーザー登録に失敗しました。';
    }
});

logoutButton.addEventListener('click', async () => {
    const data = await fetchApi('/user/logout', { method: 'POST' });
    if (data.ok) {
        await checkAuthStatus(); // ログアウト後、ログイン画面に遷移
    } else {
        alert(data.message || 'ログアウトに失敗しました。');
    }
});

testProtectedApiButton.addEventListener('click', async () => {
    apiResponseArea.textContent = 'APIにアクセス中...';
    try {
        // このAPIは認証が必要なため、未認証の場合はfetchApi内でエラーがスローされるか、
        // サーバーからエラーレスポンスが返る
        const data = await fetchApi('/api/protected');
        apiResponseArea.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        // fetchApi内でalertが表示されるので、ここでは表示エリアの更新のみ
        apiResponseArea.textContent = 'APIへのアクセスに失敗しました。\nログインしていない可能性があります。';
    }
});

// --- 初期化 ---

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});