document.addEventListener('DOMContentLoaded', () => {
    // HTML要素を取得
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const messageElement = document.getElementById('message');

    // 正しい認証情報（本来はサーバーサイドで管理します）
    const correctUsername = 'user';
    const correctPassword = 'password';

    // フォームが送信されたときの処理
    loginForm.addEventListener('submit', (event) => {
        // デフォルトのフォーム送信（ページリロード）をキャンセル
        event.preventDefault();

        // 入力された値を取得
        const enteredUsername = usernameInput.value;
        const enteredPassword = passwordInput.value;

        // 認証情報のチェック
        if (enteredUsername === correctUsername && enteredPassword === correctPassword) {
            // ログイン成功時に 'dashboard.html' にリダイレクト
            window.location.href = 'dashboard.html';
        } else {
            messageElement.textContent = 'ユーザー名またはパスワードが間違っています。';
            messageElement.style.color = 'red';
        }
    });
});
