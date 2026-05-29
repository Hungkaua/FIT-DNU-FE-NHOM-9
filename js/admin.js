import { getPendingPosts, approvePost, deletePost, getPendingAdminRequests, approveAdminRequest, rejectAdminRequest, protectAdminPage, createUserNotification, createServerNotification } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (!protectAdminPage()) return;

    const pendingList = document.getElementById('pendingList');
    const adminRequestList = document.getElementById('adminRequestList');
    const tabBtns = document.querySelectorAll('.admin-tab-btn');

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            document.getElementById(tabName).classList.add('active');

            // Load content
            if (tabName === 'posts') {
                loadPendingPosts(pendingList);
            } else if (tabName === 'admins') {
                loadAdminRequests(adminRequestList);
            }
        });
    });

    // Load initial content
    await loadPendingPosts(pendingList);

    // Server notification form (admins only)
    const serverForm = document.getElementById('serverNotificationForm');
    if (serverForm) {
        serverForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = (document.getElementById('serverNotifTitle') || {}).value || '';
            const message = (document.getElementById('serverNotifMessage') || {}).value || '';
            
            if (!title.trim() || !message.trim()) {
                alert('Vui lòng nhập tiêu đề và nội dung thông báo.');
                return;
            }

            // 1. Lưu thông báo vào hệ thống (code gốc của bạn)
            createServerNotification({ title: title.trim(), message: message.trim() });
            alert('Đã gửi thông báo toàn server.');

            // 2. TÍCH HỢP ĐẨY THÔNG BÁO RA WINDOWS ACTION CENTER
            if ("Notification" in window) {
                if (Notification.permission === "granted") {
                    pushToWindows(title.trim(), message.trim());
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then((permission) => {
                        if (permission === "granted") {
                            pushToWindows(title.trim(), message.trim());
                        }
                    });
                }
            }

            serverForm.reset();
        });
    }
});

async function loadPendingPosts(container) {
    if (!container) return;

    try {
        const posts = await getPendingPosts();

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="pending-empty">
                    <h3>Không có bài viết chờ duyệt</h3>
                    <p>Tất cả bài viết đã được duyệt hoặc chưa có bài mới gửi đến.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        for (const post of posts) {
            const card = document.createElement('article');
            card.className = 'pending-card';
            card.innerHTML = `
                <h3>${escapeHtml(post.title)}</h3>
                <div class="pending-meta">
                    <span><strong>Người gửi:</strong> ${escapeHtml(post.author || post.username || 'Không rõ')}</span>
                    <span><strong>Chủ đề:</strong> ${escapeHtml(post.community || 'r/Viễn tưởng')}</span>
                    <span><strong>Ngày gửi:</strong> ${formatTime(post.createdAt)}</span>
                </div>
                <p>${escapeHtml(post.content)}</p>
                ${post.image ? `<img src="${post.image}" alt="Ảnh bài viết" style="max-width:100%;border-radius:14px;margin-top:12px;" />` : ''}
                <div class="pending-actions">
                    <button class="btn-approve">Phê duyệt</button>
                    <button class="btn-reject">Từ chối</button>
                </div>
            `;

            const approveBtn = card.querySelector('.btn-approve');
            const rejectBtn = card.querySelector('.btn-reject');

            if (approveBtn) {
                approveBtn.addEventListener('click', async () => {
                    approveBtn.disabled = true;
                    try {
                        await approvePost(post.id);
                        card.remove();
                        if (container.children.length === 0) {
                            await loadPendingPosts(container);
                        }
                    } catch (error) {
                        console.error('Lỗi phê duyệt bài viết:', error);
                        alert('Không thể phê duyệt bài viết. Vui lòng thử lại.');
                        approveBtn.disabled = false;
                    }
                });
            }

            if (rejectBtn) {
                rejectBtn.addEventListener('click', async () => {
                    rejectBtn.disabled = true;
                    const confirmed = confirm('Bạn có chắc muốn từ chối bài viết này?');
                    if (!confirmed) {
                        rejectBtn.disabled = false;
                        return;
                    }
                    const reason = prompt('Lý do từ chối bài viết (sẽ gửi thông báo cho người gửi):', 'Nội dung không phù hợp');
                    try {
                        // Notify author (by author name)
                        const recipient = post.author || post.username || null;
                        if (recipient) {
                            createUserNotification(recipient, { title: 'Bài viết không được duyệt', message: reason || 'Bài viết của bạn không được duyệt.' });
                        }
                        await deletePost(post.id);
                        card.remove();
                        if (container.children.length === 0) {
                            await loadPendingPosts(container);
                        }
                    } catch (error) {
                        console.error('Lỗi từ chối/xóa bài viết:', error);
                        alert('Không thể xử lý yêu cầu. Vui lòng thử lại.');
                        rejectBtn.disabled = false;
                    }
                });
            }

            container.appendChild(card);
        }
    } catch (error) {
        container.innerHTML = '<p class="pending-empty">Đã xảy ra lỗi khi tải bài viết chờ duyệt.</p>';
    }
}

async function loadAdminRequests(container) {
    if (!container) return;

    try {
        const requests = await getPendingAdminRequests();

        if (requests.length === 0) {
            container.innerHTML = `
                <div class="pending-empty">
                    <h3>Không có yêu cầu admin chờ duyệt</h3>
                    <p>Tất cả yêu cầu trở thành admin đã được xét duyệt hoặc chưa có yêu cầu nào.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        for (const request of requests) {
            const card = document.createElement('article');
            card.className = 'pending-card';
            card.innerHTML = `
                <h3>Yêu cầu từ ${escapeHtml(request.nickname || request.firstName + ' ' + request.lastName)}</h3>
                <div class="pending-meta">
                    <span><strong>Email:</strong> ${escapeHtml(request.email)}</span>
                    <span><strong>Username:</strong> ${escapeHtml(request.username)}</span>
                    <span><strong>Ngày yêu cầu:</strong> ${formatTime(request.createdAt)}</span>
                </div>
                <p><strong>Họ tên:</strong> ${escapeHtml(request.firstName + ' ' + request.lastName)}</p>
                <p><strong>Ngày sinh:</strong> ${request.dob || 'Không có'}</p>
                <div class="pending-actions">
                    <button class="btn-approve">Duyệt</button>
                    <button class="btn-reject">Từ chối</button>
                </div>
            `;

            const approveBtn = card.querySelector('.btn-approve');
            const rejectBtn = card.querySelector('.btn-reject');

            if (approveBtn) {
                approveBtn.addEventListener('click', async () => {
                    approveBtn.disabled = true;
                    try {
                        await approveAdminRequest(request.id);
                        card.remove();
                        if (container.children.length === 0) {
                            await loadAdminRequests(container);
                        }
                    } catch (error) {
                        console.error('Lỗi duyệt admin:', error);
                        alert('Không thể duyệt yêu cầu. Vui lòng thử lại.');
                        approveBtn.disabled = false;
                    }
                });
            }

            if (rejectBtn) {
                rejectBtn.addEventListener('click', async () => {
                    rejectBtn.disabled = true;
                    const confirmed = confirm('Bạn có chắc muốn từ chối yêu cầu này?');
                    if (!confirmed) {
                        rejectBtn.disabled = false;
                        return;
                    }
                    const reason = prompt('Lý do từ chối yêu cầu admin (sẽ gửi thông báo cho người dùng):', 'Yêu cầu chưa đạt yêu cầu');
                    try {
                        await rejectAdminRequest(request.id);
                        // Notify the user who requested admin
                        const recipient = request.username || request.email || null;
                        if (recipient) {
                            createUserNotification(recipient, { title: 'Yêu cầu admin không được duyệt', message: reason || 'Yêu cầu của bạn không được chấp thuận.' });
                        }
                        card.remove();
                        if (container.children.length === 0) {
                            await loadAdminRequests(container);
                        }
                    } catch (error) {
                        console.error('Lỗi từ chối admin:', error);
                        alert('Không thể từ chối yêu cầu. Vui lòng thử lại.');
                        rejectBtn.disabled = false;
                    }
                });
            }

            container.appendChild(card);
        }
    } catch (error) {
        container.innerHTML = '<p class="pending-empty">Đã xảy ra lỗi khi tải yêu cầu admin.</p>';
    }
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatTime(dateString) {
    if (!dateString) return 'Vừa xong';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
}

// ==========================================
// 3. HÀM HIỂN THỊ THÔNG BÁO LÊN ACTION CENTER WINDOWS
// ==========================================
function pushToWindows(title, bodyText) {
    const notification = new Notification("BlogHub Admin: " + title, {
        body: bodyText,
        // Thay link icon dưới đây bằng logo đồ án của nhóm bạn nếu muốn xịn hơn
        icon: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        silent: false 
    });

    notification.onclick = function() {
        window.focus();
        notification.close();
    };
}