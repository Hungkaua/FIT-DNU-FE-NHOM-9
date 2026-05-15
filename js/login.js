import { login, isLoggedIn } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    const urlParams = new URLSearchParams(window.location.search);
    const redirectTarget = urlParams.get('redirect') || 'index.html';

    if (isLoggedIn()) {
        window.location.href = redirectTarget;
        return;
    }

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const identifier = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!identifier || !password) {
            alert('Vui lòng nhập đầy đủ thông tin đăng nhập.');
            return;
        }

        try {
            await login(identifier, password);
            alert('Đăng nhập thành công!');
            window.location.href = redirectTarget;
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            alert(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
    });
});
