// Authentication Logic
import { API_ENDPOINTS } from '../Endpoints.js';
import { apiRequest, apiPost } from '../utils/api.js';

export function createAuthMethods() {
    return {
        async checkAuth() {
            try {
                const data = await apiRequest(API_ENDPOINTS.user.auth);

                if (data.ok) {
                    this.isAuthenticated = true;
                    this.username = data.userId;
                    await this.loadServers();
                } else if (data.reason === 'no_user_registered') {
                    this.authMode = 'signup';
                } else {
                    this.authMode = 'login';
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.authMode = 'login';
            } finally {
                this.loading = false;
            }
        },

        async handleSignup() {
            try {
                console.log('Attempting signup with:', this.signupForm);

                const response = await fetch(API_ENDPOINTS.user.signup, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        id: this.signupForm.id,
                        password: this.signupForm.password
                    })
                });

                console.log('Signup response status:', response.status);

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('Non-JSON response:', text.substring(0, 200));
                    this.authMessage = `サーバーエラーが発生しました (Status: ${response.status})`;
                    this.authMessageType = 'error';
                    return;
                }

                const data = await response.json();
                console.log('Signup response data:', data);

                if (data.ok) {
                    this.authMessage = '登録が完了しました!';
                    this.authMessageType = 'success';
                    setTimeout(() => {
                        this.isAuthenticated = true;
                        this.username = this.signupForm.id;
                        this.loadServers();
                    }, 1000);
                } else {
                    this.authMessage = data.message || '登録に失敗しました';
                    this.authMessageType = 'error';
                }
            } catch (error) {
                console.error('Signup error:', error);
                this.authMessage = `エラーが発生しました: ${error.message}`;
                this.authMessageType = 'error';
            }
        },

        async handleLogin() {
            try {
                const data = await apiPost(API_ENDPOINTS.user.login, this.loginForm);

                if (data.ok) {
                    this.authMessage = 'ログインしました!';
                    this.authMessageType = 'success';
                    setTimeout(() => {
                        this.isAuthenticated = true;
                        this.username = this.loginForm.id;
                        this.loadServers();
                    }, 500);
                } else {
                    this.authMessage = data.message || 'ログインに失敗しました';
                    this.authMessageType = 'error';
                }
            } catch (error) {
                this.authMessage = 'エラーが発生しました';
                this.authMessageType = 'error';
            }
        },

        async handleLogout() {
            try {
                await apiPost(API_ENDPOINTS.user.logout, {});
                this.userMenuOpen = false;
                this.isAuthenticated = false;
                this.authMode = 'login';
                this.servers = [];
                this.loginForm = { id: '', password: '' };
            } catch (error) {
                console.error('Logout failed:', error);
            }
        }
    };
}
