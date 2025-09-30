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
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            credentials: 'include' // セッションCookieを含める
        });
        
        if (!response.ok && response.status !== 401 && response.status !== 409 && response.status !== 400) {
            // 401, 409, 400は業務エラーとして扱う
            throw new Error(`サーバーエラー (${response.status}): ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 認証エラーの場合の特別処理
        if (!data.ok && response.status === 401) {
            console.log('Authentication required, redirecting to login');
            // 自動的にログイン画面にリダイレクト（エラーアラート非表示）
            setTimeout(() => checkAuthStatus(), 100);
        }
        
        return data;
        
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.error(`Network error for ${endpoint}:`, error);
            throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
        }
        
        console.error(`API call to ${endpoint} failed:`, error);
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
            // フェードイン効果を追加
            setTimeout(() => {
                loginSection.style.opacity = '1';
                loginSection.style.transform = 'translateY(0)';
            }, 100);
            break;
        case 'signup':
            signupSection.style.display = 'block';
            loadingOverlay.style.display = 'none';
            // フェードイン効果を追加
            setTimeout(() => {
                signupSection.style.opacity = '1';
                signupSection.style.transform = 'translateY(0)';
            }, 100);
            break;
        case 'main':
            mainContent.style.display = 'block';
            loadingOverlay.style.display = 'none';
            // フェードイン効果を追加
            setTimeout(() => {
                mainContent.style.opacity = '1';
            }, 100);
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
    
    try {
        const data = await fetchApi('/user/auth');

        if (data.ok) {
            console.log('Authenticated:', data.userId);
            
            // ユーザー情報を更新
            const userDisplayName = document.getElementById('user-display-name');
            if (userDisplayName) {
                userDisplayName.textContent = data.userId || '管理者';
            }
            
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
    } catch (error) {
        console.error('Auth check failed:', error);
        setUIState('login');
    }
}

// --- イベントリスナーの設定 ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // UIフィードバック
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
    submitBtn.disabled = true;
    
    // メッセージクリア
    const messageEl = document.getElementById('login-message');
    messageEl.style.display = 'none';
    
    try {
        const formData = new FormData(loginForm);
        const id = formData.get('id');
        const password = formData.get('password');

        const data = await fetchApi('/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password }),
        });

        if (data.ok) {
            // 成功メッセージ表示
            messageEl.textContent = 'ログインしています...';
            messageEl.className = 'message success';
            messageEl.style.display = 'block';
            
            setTimeout(async () => {
                await checkAuthStatus(); // 認証成功後、メイン画面に遷移
            }, 1000);
        } else {
            messageEl.textContent = data.message || 'ログインに失敗しました。';
            messageEl.className = 'message error';
            messageEl.style.display = 'block';
        }
    } catch (error) {
        messageEl.textContent = 'ネットワークエラーが発生しました。';
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
    } finally {
        // ボタンを元に戻す
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // UIフィードバック
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登録中...';
    submitBtn.disabled = true;
    
    // メッセージクリア
    const messageEl = document.getElementById('signup-message');
    messageEl.style.display = 'none';
    
    try {
        const formData = new FormData(signupForm);
        const id = formData.get('id');
        const password = formData.get('password');
        
        // バリデーション
        if (id.length < 3) {
            throw new Error('ユーザーIDは3文字以上で入力してください。');
        }
        if (password.length < 6) {
            throw new Error('パスワードは6文字以上で入力してください。');
        }

        const data = await fetchApi('/user/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password }),
        });

        if (data.ok) {
            // 成功メッセージ表示
            messageEl.textContent = 'ユーザー登録が完了しました！ダッシュボードを準備中...';
            messageEl.className = 'message success';
            messageEl.style.display = 'block';
            
            setTimeout(async () => {
                await checkAuthStatus(); // 登録・ログイン成功後、メイン画面に遷移
            }, 1500);
        } else {
            messageEl.textContent = data.message || 'ユーザー登録に失敗しました。';
            messageEl.className = 'message error';
            messageEl.style.display = 'block';
        }
    } catch (error) {
        messageEl.textContent = error.message || 'ネットワークエラーが発生しました。';
        messageEl.className = 'message error';
        messageEl.style.display = 'block';
    } finally {
        // ボタンを元に戻す
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

logoutButton.addEventListener('click', async () => {
    if (!confirm('ログアウトしますか？')) return;
    
    // UIフィードバック
    const originalText = logoutButton.innerHTML;
    logoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログアウト中...';
    logoutButton.disabled = true;
    
    try {
        const data = await fetchApi('/user/logout', { method: 'POST' });
        if (data.ok) {
            // ログアウト成功のフィードバック
            logoutButton.innerHTML = '<i class="fas fa-check"></i> ログアウト完了';
            setTimeout(async () => {
                await checkAuthStatus(); // ログアウト後、ログイン画面に遷移
            }, 1000);
        } else {
            throw new Error(data.message || 'ログアウトに失敗しました。');
        }
    } catch (error) {
        alert(error.message);
        logoutButton.innerHTML = originalText;
        logoutButton.disabled = false;
    }
});

testProtectedApiButton.addEventListener('click', async () => {
    const originalText = testProtectedApiButton.innerHTML;
    testProtectedApiButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> テスト中...';
    testProtectedApiButton.disabled = true;
    
    apiResponseArea.textContent = 'API にアクセス中...\n認証システムをテストしています。';
    apiResponseArea.style.color = '#fbbf24';
    
    try {
        const startTime = Date.now();
        const data = await fetchApi('/api/protected');
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // 成功時のレスポンス表示
        const formattedResponse = {
            status: '✅ SUCCESS',
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toLocaleString('ja-JP'),
            ...data
        };
        
        apiResponseArea.textContent = JSON.stringify(formattedResponse, null, 2);
        apiResponseArea.style.color = '#10b981';
        
        // 成功メッセージ
        testProtectedApiButton.innerHTML = '<i class="fas fa-check"></i> テスト成功';
        setTimeout(() => {
            testProtectedApiButton.innerHTML = originalText;
        }, 3000);
        
    } catch (error) {
        // エラー時のレスポンス表示
        const errorResponse = {
            status: '❌ ERROR',
            timestamp: new Date().toLocaleString('ja-JP'),
            error: error.message || 'APIへのアクセスに失敗しました',
            note: 'ログインしていない可能性があります。'
        };
        
        apiResponseArea.textContent = JSON.stringify(errorResponse, null, 2);
        apiResponseArea.style.color = '#ef4444';
        
        testProtectedApiButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> テスト失敗';
        setTimeout(() => {
            testProtectedApiButton.innerHTML = originalText;
        }, 3000);
    } finally {
        testProtectedApiButton.disabled = false;
    }
});

// --- 初期化 ---

// フェードイン効果のためのCSS追加
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    #login-section, #signup-section {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    #main-content {
        opacity: 0;
        transition: opacity 0.4s ease;
    }
`;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', () => {
    // 少し遅延させて滑らかなローディング体験を提供
    setTimeout(() => {
        checkAuthStatus();
    }, 500);
});