import { register } from './api.js';
<<<<<<< HEAD
import { showToast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm') || document.querySelector('.register-form');
=======

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('.register-form');
>>>>>>> fa95cddcd1c8c81bdd1b41baf3e3f5b90f430464

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

<<<<<<< HEAD
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
=======
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
>>>>>>> fa95cddcd1c8c81bdd1b41baf3e3f5b90f430464
            email,
            password,
            firstName,
            lastName,
<<<<<<< HEAD
            nickname: username,
            role: 'reader',
            dob,
            avatar: 'https://via.placeholder.com/32',
            adminApproved: true,
            status: 'active'
=======
            nickname,
            role,
            dob,
            avatar: 'https://via.placeholder.com/32',
            adminApproved: role === 'admin' ? false : true,
            status: role === 'admin' ? 'pending_approval' : 'active'
>>>>>>> fa95cddcd1c8c81bdd1b41baf3e3f5b90f430464
        };

        try {
            await register(newUser);
<<<<<<< HEAD
            showToast('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.', 'success');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            showToast(error.message || 'Đăng ký thất bại. Vui lòng thử lại.', 'error');
        }
    });
=======
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
>>>>>>> fa95cddcd1c8c81bdd1b41baf3e3f5b90f430464
});
