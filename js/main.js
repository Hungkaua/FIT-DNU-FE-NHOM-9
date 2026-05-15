// main.js - Tích hợp API để tải và hiển thị bài viết

import { getAllPosts, createPost, isLoggedIn, getCurrentUser, logout } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const postFeed = document.querySelector('.post-feed');
    const createPostForm = document.getElementById('createPostForm');
    const openCreatePostButton = document.getElementById('openCreatePost');
    const createPostCard = document.getElementById('createPostCard');
    const userInfoContainer = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
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
        const redirectUrl = new URL(window.location.href);
        redirectUrl.pathname = 'login.html';
        redirectUrl.searchParams.set('redirect', 'index.html');
        window.location.href = redirectUrl.toString();
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
            posts.forEach(post => {
                const postElement = createPostElement(post);
                postFeed.appendChild(postElement);
            });
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
        const postElement = createPostElement(createdPost);
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

function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'post-card';

    article.innerHTML = `
        <div class="post-header">
            <img src="${post.avatar || ''}" alt="Avatar" class="avatar">
            <div class="post-info">
                <span class="community-name">${post.community || 'r/Unknown'}</span>
                <span class="post-time">• ${formatTime(post.createdAt)}</span>
            </div>
        </div>
        <h2 class="post-title">${post.title}</h2>
        <p class="post-snippet">${post.content}</p>
        ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        <div class="post-actions">
            <button class="action-btn">👍 ${post.likes || 0}</button>
            <button class="action-btn">💬 ${post.comments || 0}</button>
            <button class="action-btn">↗️ Chia sẻ</button>
        </div>
    `;

    return article;
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