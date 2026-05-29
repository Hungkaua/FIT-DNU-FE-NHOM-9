import { register } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('.register-form');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const nickname = document.getElementById('nickname').value.trim();
        const email = document.getElementById('email').value.trim();
        const role = document.getElementById('role').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const dob = document.getElementById('dob').value;

        if (!firstName || !lastName || !nickname || !email || !role || !password || !confirmPassword) {
            alert('Vui lòng điền đầy đủ thông tin.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Mật khẩu xác nhận không khớp.');
            return;
        }

        const newUser = {
            username: email,
            email,
            password,
            firstName,
            lastName,
            nickname,
            role,
            dob,
            avatar: 'https://via.placeholder.com/32',
            adminApproved: role === 'admin' ? false : true,
            status: role === 'admin' ? 'pending_approval' : 'active'
        };

        try {
            await register(newUser);
            if (role === 'admin') {
                alert('Yêu cầu trở thành admin của bạn đã được gửi đến các quản trị viên. Vui lòng chờ duyệt.');
            } else {
                alert('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
            }
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            alert(error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        }    });
});
