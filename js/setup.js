import { register } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const createAdminBtn = document.getElementById('btnCreateAdmin');
    const createUserBtn = document.getElementById('btnCreateUser');
    const successBox = document.getElementById('setupSuccess');
    const errorBox = document.getElementById('setupError');

    const showMessage = (box, message, type) => {
        if (!box) return;
        box.className = `alert-box ${type} ${message ? '' : 'hidden'}`;
        box.textContent = message || '';
        box.classList.toggle('hidden', !message);
    };

    const createSampleAccount = async (account) => {
        showMessage(successBox, '', 'success');
        showMessage(errorBox, '', 'error');

        try {
            await register(account);
            showMessage(successBox, `Tài khoản ${account.username} đã được tạo thành công.`, 'success');
        } catch (error) {
            showMessage(errorBox, error.message || 'Không thể tạo tài khoản mẫu.', 'error');
        }
    };

    if (createAdminBtn) {
        createAdminBtn.addEventListener('click', () => createSampleAccount({
            username: 'admin',
            nickname: 'Administrator',
            password: '123456',
            email: 'admin@bloghub.com',
            role: 'admin',
            dob: '2000-01-01',
            firstName: 'Admin',
            lastName: 'User',
            avatar: 'https://via.placeholder.com/32',
            adminApproved: true,
            status: 'active'
        }));
    }

    if (createUserBtn) {
        createUserBtn.addEventListener('click', () => createSampleAccount({
            username: 'user',
            nickname: 'User Name',
            password: '123456',
            email: 'user@bloghub.com',
            role: 'reader',
            dob: '2001-05-14',
            firstName: 'Test',
            lastName: 'User',
            avatar: 'https://via.placeholder.com/32',
            adminApproved: true,
            status: 'active'
        }));
    }
});
