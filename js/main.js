// main.js - Tích hợp API để tải và hiển thị bài viết

import { getAllPosts, createPost, isLoggedIn, getCurrentUser, logout, getCommentsByPost, createComment, isAdmin, getUserNotifications, getServerNotifications, markAllUserNotificationsRead } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const postFeed = document.querySelector('.post-feed');
    const createPostForm = document.getElementById('createPostForm');
    const openCreatePostButton = document.getElementById('openCreatePost');
    const createPostCard = document.getElementById('createPostCard');
    const logoutButton = document.getElementById('logoutButton');

    if (openCreatePostButton) {
        openCreatePostButton.addEventListener('click', () => handleOpenCreatePost(createPostCard));
    }

    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreatePost);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    renderHeaderUser();
    await loadPosts(postFeed);
    renderNotifications();
});

function renderHeaderUser() {
    const currentUser = getCurrentUser();
    const loginLink = document.querySelector('.btn-login');
    const registerLink = document.querySelector('.btn-register');
    const userInfoContainer = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    const adminLink = document.getElementById('adminLink');

    if (currentUser && userInfoContainer) {
        userInfoContainer.classList.remove('hidden');
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (adminLink) {
            if (isAdmin()) {
                adminLink.classList.remove('hidden');
            } else {
                adminLink.classList.add('hidden');
            }
        }
        if (userAvatar) {
            userAvatar.src = currentUser.avatar || 'https://via.placeholder.com/32';
        }
        if (userName) {
            userName.textContent = currentUser.nickname || currentUser.username || 'Người dùng';
        }
    } else {
        if (userInfoContainer) userInfoContainer.classList.add('hidden');
        if (loginLink) loginLink.style.display = 'inline-block';
        if (registerLink) registerLink.style.display = 'inline-block';
        if (adminLink) adminLink.classList.add('hidden');
    }
}

function renderNotifications() {
    const currentUser = getCurrentUser();
    const notifToggle = document.getElementById('notifToggle');
    const notifCount = document.getElementById('notifCount');
    const notifDropdown = document.getElementById('notifDropdown');

    if (!notifToggle || !notifDropdown || !notifCount) return;

    // Lắng nghe sự kiện click vào quả chuông
    notifToggle.addEventListener('click', () => {
        
        // 1. Gom TẤT CẢ thông báo (User & Admin) và sắp xếp mới nhất lên đầu
        let allNotifs = [];
        if (currentUser) {
            allNotifs.push(...getUserNotifications(currentUser.username || currentUser.nickname || ''));
        }
        if (isAdmin()) {
            allNotifs.push(...getServerNotifications());
        }
        // Lệnh sắp xếp theo thời gian
        allNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // CẮT LẤY 3 THÔNG BÁO MỚI NHẤT (BẤT KỂ ĐÃ ĐỌC HAY CHƯA) ĐỂ ĐẨY RA WINDOWS
        const latestNotifs = allNotifs.slice(0, 3);

        // 2. BẮN THÔNG BÁO RA MÀN HÌNH ACTION CENTER
        if ("Notification" in window) {
            if (Notification.permission === "default") {
                // Xin quyền lần đầu
                Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                        if (latestNotifs.length > 0) {
                            latestNotifs.forEach(n => showOSNotification(n.title, n.message));
                        } else {
                            showOSNotification("BlogHub", "Hệ thống thông báo đã sẵn sàng!");
                        }
                    }
                });
            } else if (Notification.permission === "granted") {
                // Đã có quyền -> Cứ bấm chuông là bắn 3 cái mới nhất ra màn hình!
                if (latestNotifs.length > 0) {
                    latestNotifs.forEach(n => showOSNotification(n.title, n.message));
                }
            }
        }

        // 3. Mở bảng Dropdown trên trang web
        notifDropdown.classList.toggle('hidden');
        
        if (!notifDropdown.classList.contains('hidden')) {
            renderNotifList(allNotifs);
            // Xóa chấm đỏ báo hiệu đã đọc
            if (currentUser) {
                markAllUserNotificationsRead(currentUser.username || currentUser.nickname || '');
            }
            notifCount.classList.add('hidden');
        }
    });

    // Hàm render danh sách đổ xuống UI
    function renderNotifList(items) {
        if (!items || items.length === 0) {
            notifDropdown.innerHTML = '<div class="notif-empty" style="padding: 20px; text-align: center; color: var(--text-muted);">Không có thông báo.</div>';
            return;
        }

        notifDropdown.innerHTML = items.slice(0, 20).map(n => `
            <div class="notif-item">
                <div class="notif-title">${escapeHtml(n.title || '')}</div>
                <div class="notif-message">${escapeHtml(n.message || '')}</div>
                <div class="notif-time">${formatTime(n.createdAt)}</div>
            </div>
        `).join('');
    }

    // Cập nhật số đếm chấm đỏ trên quả chuông khi load trang
    if (currentUser) {
        const userNotifs = getUserNotifications(currentUser.username || currentUser.nickname || '');
        const unread = userNotifs.filter(n => !n.read).length;
        if (unread > 0) {
            notifCount.textContent = unread;
            notifCount.classList.remove('hidden');
        } else {
            notifCount.classList.add('hidden');
        }
    } else {
        notifCount.classList.add('hidden');
    }
}

function handleLogout() {
    logout();
    window.location.href = 'index.html';
}

function handleOpenCreatePost(createPostCard) {
    if (!isLoggedIn()) {
        alert('Bạn cần đăng nhập để tạo bài viết.');
        const path = window.location.pathname;
        const base = path.substring(0, path.lastIndexOf('/') + 1);
        window.location.href = `${base}login.html?redirect=${encodeURIComponent(`${base}index.html`)}`;
        return;
    }

    if (createPostCard) {
        createPostCard.classList.remove('hidden');
        createPostCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function loadPosts(postFeed) {
    if (!postFeed) return;

    try {
        const posts = await getAllPosts();
        const visiblePosts = posts.filter(post => post.approved === undefined || post.approved === true || post.approved === 'true');

        if (visiblePosts.length > 0) {
            postFeed.innerHTML = '';
            visiblePosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            for (const post of visiblePosts) {
                const postElement = await createPostElement(post);
                postFeed.appendChild(postElement);
            }
        } else {
            postFeed.innerHTML = '<div class="empty-state">Chưa có bài viết nào. Hãy tạo bài viết đầu tiên!</div>';
        }
    } catch (error) {
        console.error('Lỗi tải bài viết:', error);
        postFeed.innerHTML = '<div class="empty-state">Không thể tải bài viết. Vui lòng thử lại sau.</div>';
    }
}

async function handleCreatePost(event) {
    event.preventDefault();

    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const communityInput = document.getElementById('postCommunity');
    const imageInput = document.getElementById('postImage');
    const postFeed = document.querySelector('.post-feed');

    const currentUser = getCurrentUser();
    const newPost = {
        title: titleInput.value.trim(),
        content: contentInput.value.trim(),
        community: communityInput.value.trim() || 'r/Viễn tưởng',
        image: imageInput.value.trim() || '',
        avatar: currentUser?.avatar || 'https://via.placeholder.com/30',
        author: currentUser?.nickname || currentUser?.username || 'Người dùng',
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
        approved: isAdmin(),
        status: isAdmin() ? 'approved' : 'pending',
    };

    if (!newPost.title || !newPost.content) {
        alert('Vui lòng nhập tiêu đề và nội dung bài viết.');
        return;
    }

    try {
        await createPost(newPost);
        event.target.reset();
        if (createPostCard) {
            createPostCard.classList.add('hidden');
        }
        
        if (isAdmin()) {
            alert('Bài viết đã được đăng ngay.');
            showOSNotification("BlogHub", "Bài viết của bạn đã được xuất bản thành công!");
        } else {
            alert('Bài viết của bạn đã được gửi đến admin để duyệt.');
            showOSNotification("BlogHub", "Bài viết đã được gửi đến Admin để chờ duyệt!");
        }
        
        if (isAdmin()) {
            await loadPosts(postFeed);
        }
        
    } catch (error) {
        console.error('Lỗi tạo bài viết:', error);
        alert('Không thể tạo bài viết. Vui lòng thử lại.');
    }
}

async function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'post-card';

    article.innerHTML = `
        <div class="post-header">
            <img src="${post.avatar || 'https://via.placeholder.com/40'}" alt="Avatar" class="avatar">
            <div class="post-info">
                <span class="community-name">${escapeHtml(post.community || 'r/Unknown')}</span>
                <span class="post-time">• ${formatTime(post.createdAt)}</span>
            </div>
        </div>
        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        <p class="post-snippet">${escapeHtml(post.content)}</p>
        ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        <div class="post-actions">
            <button class="action-btn">👍 ${post.likes || 0}</button>
            <button class="action-btn comment-toggle-btn" type="button">
                <i class="fa-regular fa-comment"></i>
                <span class="comment-count">${post.comments || 0}</span>
            </button>
            <button class="action-btn">↗️ Chia sẻ</button>
        </div>
        <div class="post-comments hidden">
            <div class="comment-list"></div>
            <form class="comment-form">
                <input class="comment-username" type="text" placeholder="Tên của bạn">
                <textarea class="comment-input" placeholder="Viết bình luận..." rows="3" required></textarea>
                <button type="submit" class="btn-submit">Gửi bình luận</button>
            </form>
        </div>
    `;

    const currentUser = getCurrentUser();
    const commentsPanel = article.querySelector('.post-comments');
    const commentList = article.querySelector('.comment-list');
    const commentForm = article.querySelector('.comment-form');
    const usernameInput = article.querySelector('.comment-username');
    const commentCountSpan = article.querySelector('.comment-count');
    const toggleButton = article.querySelector('.comment-toggle-btn');

    if (currentUser && usernameInput) {
        usernameInput.value = currentUser.nickname || currentUser.username || '';
        usernameInput.readOnly = true;
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', async () => {
            if (commentsPanel) {
                commentsPanel.classList.toggle('hidden');
                if (!commentsPanel.classList.contains('hidden')) {
                    await renderCommentsForPost(post.id, commentList, commentCountSpan);
                }
            }
        });
    }

    if (commentForm) {
        commentForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!isLoggedIn()) {
                alert('Bạn cần đăng nhập để bình luận.');
                handleOpenCreatePost(document.getElementById('createPostCard'));
                return;
            }

            const username = (usernameInput.value || '').trim() || 'Khách vãng lai';
            const messageInput = article.querySelector('.comment-input');
            const message = (messageInput.value || '').trim();

            if (!message) {
                alert('Vui lòng viết một bình luận trước khi gửi.');
                return;
            }

            try {
                await createComment({
                    postId: post.id,
                    username,
                    message,
                    createdAt: new Date().toISOString(),
                });

                if (messageInput) messageInput.value = '';
                await renderCommentsForPost(post.id, commentList, commentCountSpan);
                if (commentsPanel && commentsPanel.classList.contains('hidden')) {
                    commentsPanel.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Lỗi gửi bình luận:', error);
                alert('Không thể gửi bình luận. Vui lòng thử lại.');
            }
        });
    }

    return article;
}

async function renderCommentsForPost(postId, commentList, commentCountSpan) {
    if (!commentList) return;

    try {
        const comments = await getCommentsByPost(postId);
        if (commentCountSpan) commentCountSpan.textContent = comments.length;

        if (comments.length === 0) {
            commentList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:14px; background:#F8FAFC; border-radius:8px;">Chưa có bình luận nào. Hãy viết bình luận đầu tiên!</div>';
            return;
        }

        commentList.innerHTML = comments
            .slice()
            .reverse()
            .map(comment => `
                <div class="comment-item" style="padding: 12px; background: #F8FAFC; border-radius: 8px; margin-bottom: 12px;">
                    <div class="comment-header" style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                        <strong style="font-size: 14px; color: var(--text-main);">${escapeHtml(comment.username)}</strong>
                        <span style="font-size: 12px; color: var(--text-muted);">${new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <p style="font-size: 14px; color: var(--text-main); line-height: 1.5; margin: 0;">${escapeHtml(comment.message)}</p>
                </div>
            `)
            .join('');
    } catch (error) {
        console.error('Lỗi tải bình luận:', error);
        commentList.innerHTML = '<p class="no-comments">Không thể tải bình luận.</p>';
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
// HÀM HELPER: HIỂN THỊ THÔNG BÁO WINDOWS ACTION CENTER
// ==========================================
function showOSNotification(title, message) {
    if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(title, {
            body: message,
            icon: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            silent: false 
        });

        notification.onclick = function() {
            window.focus();
            notification.close();
        };
    }
}