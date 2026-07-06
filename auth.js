document.addEventListener('DOMContentLoaded', function () {
    const showForgot = document.getElementById('showForgot');
    const showLoginFromForgot = document.getElementById('showLoginFromForgot');
    const forgotSection = document.getElementById('forgotSection');
    const loginSection = document.getElementById('loginSection');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');

    showForgot.addEventListener('click', function (e) {
        e.preventDefault();
        loginSection.classList.add('hidden');
        forgotSection.classList.remove('hidden');
    });

    showLoginFromForgot.addEventListener('click', function (e) {
        e.preventDefault();
        forgotSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = this.querySelector('input[type="text"]').value.trim();
        const password = this.querySelector('input[type="password"]').value.trim();

        if (email && password) {
            window.location.href = 'index.html';
        }
    });

    registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = this.querySelector('input[type="text"]').value.trim();
        const email = this.querySelector('input[type="email"]').value.trim();
        const password = this.querySelector('input[type="password"]').value.trim();

        if (!name || !email || !password) {
            alert('Vui lòng điền đầy đủ thông tin.');
            return;
        }

        alert('Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.');
        window.location.reload();
    });

    forgotForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = this.querySelector('input[type="email"]').value.trim();

        if (!email) {
            alert('Vui lòng nhập email để lấy lại mật khẩu.');
            return;
        }

        alert('Yêu cầu lấy lại mật khẩu đã được gửi tới ' + email + '.');
        forgotSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });
});