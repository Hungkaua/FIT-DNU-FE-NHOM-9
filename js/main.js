// main.js - Tích hợp API để tải và hiển thị bài viết

import { getAllPosts, createPost, isLoggedIn, getCurrentUser, logout, getCommentsByPost, createComment } from './api.js';

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
});

function renderHeaderUser() {
    const currentUser = getCurrentUser();
    const loginLink = document.querySelector('.btn-login');
    const registerLink = document.querySelector('.btn-register');
    const userInfoContainer = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (currentUser && userInfoContainer) {
        userInfoContainer.classList.remove('hidden');
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
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

        if (posts.length > 0) {
            postFeed.innerHTML = '';
            posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            for (const post of posts) {
                const postElement = await createPostElement(post);
                postFeed.appendChild(postElement);
            }
        }
    } catch (error) {
        console.error('Lỗi tải bài viết:', error);
    }
}

async function handleCreatePost(event) {
    event.preventDefault();

    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const communityInput = document.getElementById('postCommunity');
    const imageInput = document.getElementById('postImage');
    const postFeed = document.querySelector('.post-feed');

    const newPost = {
        title: titleInput.value.trim(),
        content: contentInput.value.trim(),
        community: communityInput.value.trim() || 'r/Viễn tưởng',
        image: imageInput.value.trim() || '',
        avatar: 'https://via.placeholder.com/30',
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
    };

    if (!newPost.title || !newPost.content) {
        alert('Vui lòng nhập tiêu đề và nội dung bài viết.');
        return;
    }

    try {
        const createdPost = await createPost(newPost);
        const postElement = await createPostElement(createdPost);
        if (postFeed) {
            postFeed.prepend(postElement);
        }
        event.target.reset();
        alert('Đã tạo bài viết mới và lưu vào MockAPI.');
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
            <img src="${post.avatar || ''}" alt="Avatar" class="avatar">
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
            commentList.innerHTML = '<p class="no-comments">Chưa có bình luận nào. Hãy viết bình luận đầu tiên!</p>';
            return;
        }

        commentList.innerHTML = comments
            .slice()
            .reverse()
            .map(comment => `
                <div class="comment-item">
                    <div class="comment-header">
                        <strong>${escapeHtml(comment.username)}</strong>
                        <span>${new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <p>${escapeHtml(comment.message)}</p>
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