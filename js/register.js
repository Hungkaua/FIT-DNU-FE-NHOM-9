import { register } from './api.js';
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm') || document.querySelector('.register-form');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const emailInput = document.getElementById('regEmail');
        const usernameInput = document.getElementById('regUsername');
        const passwordInput = document.getElementById('regPassword');

        const email = emailInput?.value.trim() || '';
        const username = usernameInput?.value.trim() || '';
        const password = passwordInput?.value || '';
        const dob = document.getElementById('dob')?.value || '';

        if (!email || !username || !password) {
            alert('Vui lòng điền đầy đủ email, bút danh và mật khẩu.');
            return;
        }

        if (password.length < 6) {
            alert('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        const firstName = username.split(' ')[0] || 'User';
        const lastName = username.split(' ').slice(1).join(' ') || 'User';

        const newUser = {
            username,
            email,
            password,
            firstName,
            lastName,
            nickname: username,
            role: 'reader',
            dob,
            avatar: 'https://via.placeholder.com/32',
            adminApproved: true,
            status: 'active'
        };

        try {
            await register(newUser);
            showToast('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.', 'success');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            showToast(error.message || 'Đăng ký thất bại. Vui lòng thử lại.', 'error');
        }
    });
});
