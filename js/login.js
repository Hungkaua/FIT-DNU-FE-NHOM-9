import { login, isLoggedIn } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    const urlParams = new URLSearchParams(window.location.search);
    const redirectTarget = urlParams.get('redirect') || 'index.html';
    const path = window.location.pathname;
    const base = path.substring(0, path.lastIndexOf('/') + 1);
    let redirectUrl;

    if (redirectTarget.startsWith('http')) {
        redirectUrl = redirectTarget;
    } else if (redirectTarget.startsWith('/')) {
        redirectUrl = redirectTarget;
    } else {
        redirectUrl = `${base}${redirectTarget}`;
    }

    if (isLoggedIn()) {
        window.location.href = redirectUrl;
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
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (user.role === 'admin' && user.adminApproved === false) {
                alert('Tài khoản admin của bạn đang chờ duyệt từ các quản trị viên khác.');
                localStorage.removeItem('currentUser');
                return;
            }
            alert('Đăng nhập thành công!');
            window.location.href = redirectUrl;
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            alert(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        }    });
});
