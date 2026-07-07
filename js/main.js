// main.js - Tích hợp API để tải và hiển thị bài viết

import { getAllPosts, createPost, isLoggedIn, getCurrentUser, logout, getCommentsByPost, createComment, isAdmin, getUserNotifications, getServerNotifications, markAllUserNotificationsRead, createUserNotification } from './api.js';
import { showToast } from './ui.js';

let allLoadedPosts = [];
let currentPage = 1;
const POSTS_PER_PAGE = 6;
const JOINED_COMMUNITIES_KEY = 'joinedCommunities';
const DRAFTS_STORAGE_KEY = 'forumDrafts';
const POST_REACTIONS_KEY = 'postReactions';
const KNOWN_COMMUNITIES = ['Góc Sáng Tác', 'Thảo Luận', 'Sci-Fi Phim', 'Game Lore'];

// =======================================================
// HÀM HỖ TRỢ CHUNG
// =======================================================

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
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

function createActivityNotification(title, message) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const username = currentUser.username || currentUser.nickname || '';
    if (!username) return;
    createUserNotification(username, { title, message });
}

// =======================================================
// HÀM XỬ LÝ LƯU TRỮ REACTION
// =======================================================

function getStoredPostReactions() {
    try {
        return JSON.parse(localStorage.getItem(POST_REACTIONS_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function saveStoredPostReactions(reactions) {
    localStorage.setItem(POST_REACTIONS_KEY, JSON.stringify(reactions));
}

function getPostReaction(postId) {
    const reactions = getStoredPostReactions();
    return reactions[postId] || { liked: false, vote: 'none' };
}

function updatePostReaction(postId, updates) {
    const reactions = getStoredPostReactions();
    reactions[postId] = { ...getPostReaction(postId), ...updates };
    saveStoredPostReactions(reactions);
    return reactions[postId];
}

function getDisplayLikeCount(post, reaction) {
    const baseValue = Number(post.likes || 0);
    return baseValue + (reaction.liked ? 1 : 0);
}

function getDisplayVoteCount(post, reaction) {
    const baseValue = Number(post.likes || 0);
    if (reaction.vote === 'up') return baseValue + 1;
    if (reaction.vote === 'down') return Math.max(0, baseValue - 1);
    return baseValue;
}

// =======================================================
// HÀM XỬ LÝ THAM GIA CỘNG ĐỒNG
// =======================================================

function getJoinedCommunitiesKey() {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username) {
        return `joinedCommunities_${currentUser.username}`;
    }
    return 'joinedCommunities_guest';
}

function getJoinedCommunities() {
    try {
        const data = localStorage.getItem(getJoinedCommunitiesKey());
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Lỗi đọc dữ liệu cộng đồng từ LocalStorage:", error);
        return [];
    }
}

function isJoinedCommunity(communityName) {
    const joinedList = getJoinedCommunities();
    return joinedList.includes(communityName);
}

function updateJoinButtonUI(buttonElement, communityName) {
    if (!buttonElement) return;

    if (isJoinedCommunity(communityName)) {
        buttonElement.textContent = 'Đã tham gia';
        buttonElement.classList.add('joined');
        buttonElement.classList.add('active');
    } else {
        buttonElement.textContent = 'Tham gia';
        buttonElement.classList.remove('joined');
        buttonElement.classList.remove('active');
    }
}

function handleJoinCommunityToggle(buttonElement, communityName) {
    if (!isLoggedIn()) {
        showToast('Vui lòng đăng nhập để tham gia cộng đồng!', 'error');
        return;
    }

    let joinedList = getJoinedCommunities();

    if (joinedList.includes(communityName)) {
        joinedList = joinedList.filter(name => name !== communityName);
        showToast(`Đã rời khỏi cộng đồng ${communityName}`, 'info');
    } else {
        joinedList.push(communityName);
        showToast(`Bạn đã tham gia cộng đồng ${communityName}!`, 'success');
    }

    localStorage.setItem(getJoinedCommunitiesKey(), JSON.stringify(joinedList));
    updateJoinButtonUI(buttonElement, communityName);
}

function syncCommunityButtons() {
    document.querySelectorAll('.btn-join, .btn-join-outline, .btn-follow').forEach(button => {
        const communityName = button.dataset.community || button.textContent.replace(/\s+/g, ' ').trim();
        if (communityName) {
            updateJoinButtonUI(button, communityName);
        }
    });
}

// =======================================================
// HÀM XỬ LÝ LƯU BÀI VIẾT
// =======================================================

function getSavedPostIds() {
    try {
        return JSON.parse(localStorage.getItem('savedPosts') || '[]').map(id => String(id));
    } catch (error) {
        return [];
    }
}

function savePostIds(ids) {
    localStorage.setItem('savedPosts', JSON.stringify(ids.map(id => String(id))));
}

function toggleSavedPost(postId) {
    const normalizedPostId = String(postId);
    const savedIds = getSavedPostIds();
    const wasSaved = savedIds.includes(normalizedPostId);
    const updated = wasSaved
        ? savedIds.filter(id => id !== normalizedPostId)
        : [...savedIds, normalizedPostId];
    savePostIds(updated);
    renderSavedPosts();
    createActivityNotification(
        wasSaved ? 'Đã bỏ lưu bài viết' : 'Đã lưu bài viết',
        wasSaved ? 'Bài viết đã được bỏ khỏi danh sách lưu.' : 'Bài viết đã được thêm vào danh sách lưu.'
    );
    return updated;
}

function isPostSaved(postId) {
    return getSavedPostIds().includes(String(postId));
}

function renderSavedPosts() {
    const panel = document.getElementById('savedPostsPanel');
    if (!panel) return;

    const savedIds = getSavedPostIds();
    const savedPosts = allLoadedPosts.filter(post => savedIds.includes(String(post.id)));

    if (savedPosts.length === 0) {
        panel.innerHTML = '<div class="saved-posts-empty">Bạn chưa lưu bài viết nào. Hãy lưu để xem lại sau.</div>';
        return;
    }

    panel.innerHTML = `
        <div class="saved-posts-title">Bài viết đã lưu (${savedPosts.length})</div>
        <div class="saved-posts-list">
            ${savedPosts.map(post => `
                <a class="saved-post-item" href="post-detail.html?id=${post.id}" target="_self">
                    <strong>${escapeHtml(post.title || 'Bài viết')}</strong>
                    <span>${escapeHtml(post.community || 'r/Viễn tưởng')}</span>
                </a>
            `).join('')}
        </div>
    `;
}

// =======================================================
// HÀM XỬ LÝ BẢN NHÁP
// =======================================================

function getStoredDrafts() {
    try {
        return JSON.parse(localStorage.getItem(DRAFTS_STORAGE_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function saveDraftToStorage(draft, silent = false) {
    const drafts = getStoredDrafts();
    drafts[getCurrentDraftKey()] = draft;
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    if (!silent) {
        showToast('Đã lưu bản nháp.', 'success');
    }
}

function clearDraft() {
    const drafts = getStoredDrafts();
    delete drafts[getCurrentDraftKey()];
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

function getCurrentDraftKey() {
    return getCurrentUser()?.username || getCurrentUser()?.nickname || 'guest';
}

function insertEditorText(textarea, prefix) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || 'nội dung';
    const inserted = prefix === '[text](url)' ? `[${selected}]` : prefix === '**' || prefix === '*' || prefix === '~~' ? `${prefix}${selected}${prefix}` : `${prefix}${selected}`;
    textarea.value = `${textarea.value.slice(0, start)}${inserted}${textarea.value.slice(end)}`;
    textarea.focus();
    const cursorPosition = start + inserted.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
}

// =======================================================
// HÀM RENDER COMMENTS
// =======================================================

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

// =======================================================
// HÀM TẠO POST ELEMENT
// =======================================================

async function createPostElement(post) {
    const reaction = getPostReaction(post.id);
    const article = document.createElement('article');
    article.className = 'post-card reddit-post-card';

    article.innerHTML = `
        <div class="vote-column">
            <button class="vote-btn upvote" type="button" data-vote="up"><i class="fa-solid fa-caret-up"></i></button>
            <span class="vote-count">${post.likes || 0}</span>
            <button class="vote-btn downvote" type="button" data-vote="down"><i class="fa-solid fa-caret-down"></i></button>
        </div>
        <div class="post-content-area">
            <div class="post-header">
                <img src="${post.avatar || 'https://via.placeholder.com/40'}" alt="Avatar" class="user-avatar-small">
                <div class="post-meta">
                    <span class="post-community">${escapeHtml(post.community || 'r/Unknown')}</span>
                    <span class="separator">•</span>
                    <span class="post-author">Đăng bởi u/${escapeHtml(post.author || 'Unknown')}</span>
                    <span class="post-time">${formatTime(post.createdAt)}</span>
                </div>
                <div class="quick-actions-wrapper">
                    <button class="btn-join-small js-btn-options" type="button" aria-label="Tùy chọn bài viết"><i class="fa-solid fa-ellipsis"></i></button>
                    <div class="quick-actions-menu hidden">
                        <button class="quick-action-btn" type="button" data-action="detail">Mở chi tiết</button>
                        <button class="quick-action-btn" type="button" data-action="save">Lưu bài</button>
                        <button class="quick-action-btn" type="button" data-action="share">Chia sẻ</button>
                    </div>
                </div>
            </div>
            <a href="post-detail.html?id=${post.id}" class="post-title-link">
                <h2 class="post-title">${escapeHtml(post.title)}</h2>
            </a>
            <a href="post-detail.html?id=${post.id}" class="post-snippet-link">
                <p class="post-snippet">${escapeHtml(post.content)}</p>
            </a>
            ${post.image ? `<a href="post-detail.html?id=${post.id}" class="post-image-link"><img src="${post.image}" alt="Post image" class="post-image"></a>` : ''}
            <div class="post-actions">
                <button class="action-btn like-btn" type="button" data-liked="${reaction.liked ? 'true' : 'false'}">
                    <i class="${reaction.liked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i>
                    <span class="like-count">${getDisplayLikeCount(post, reaction)}</span>
                </button>
                <button class="action-btn comment-toggle-btn" type="button">
                    <i class="fa-regular fa-comment"></i>
                    <span class="comment-count">${post.comments || 0}</span>
                </button>
                <button class="action-btn share-btn" type="button">
                    <i class="fa-solid fa-share-nodes"></i>
                    <span>Chia sẻ</span>
                </button>
                <button class="action-btn save-btn ${isPostSaved(post.id) ? 'saved' : ''}" type="button" data-post-id="${post.id || ''}">
                    <i class="${isPostSaved(post.id) ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
                    <span>${isPostSaved(post.id) ? 'Đã lưu' : 'Lưu'}</span>
                </button>
            </div>
            <div class="post-comments hidden">
                <div class="comment-list"></div>
                <form class="comment-form">
                    <input class="comment-username" type="text" placeholder="Tên của bạn">
                    <textarea class="comment-input" placeholder="Viết bình luận..." rows="3" required></textarea>
                    <button type="submit" class="btn-submit">Gửi bình luận</button>
                </form>
            </div>
        </div>
    `;

    const currentUser = getCurrentUser();
    const commentsPanel = article.querySelector('.post-comments');
    const commentList = article.querySelector('.comment-list');
    const commentForm = article.querySelector('.comment-form');
    const usernameInput = article.querySelector('.comment-username');
    const commentCountSpan = article.querySelector('.comment-count');
    const toggleButton = article.querySelector('.comment-toggle-btn');
    const likeButton = article.querySelector('.like-btn');
    const shareButton = article.querySelector('.share-btn');
    const saveButton = article.querySelector('.save-btn');
    const menuButton = article.querySelector('.js-btn-options');
    const quickActionsMenu = article.querySelector('.quick-actions-menu');
    const upvoteButton = article.querySelector('.vote-btn.upvote');
    const downvoteButton = article.querySelector('.vote-btn.downvote');
    const voteCount = article.querySelector('.vote-count');

    if (currentUser && usernameInput) {
        usernameInput.value = currentUser.nickname || currentUser.username || '';
        usernameInput.readOnly = true;
    }

    if (commentCountSpan) {
        getCommentsByPost(post.id)
            .then(comments => {
                commentCountSpan.textContent = comments.length;
            })
            .catch(() => {});
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', async () => {
            if (commentsPanel) {
                commentsPanel.classList.toggle('hidden');
                toggleButton.classList.toggle('active', !commentsPanel.classList.contains('hidden'));
                if (!commentsPanel.classList.contains('hidden')) {
                    await renderCommentsForPost(post.id, commentList, commentCountSpan);
                }
            }
        });
    }

    if (upvoteButton && downvoteButton && voteCount) {
        let voteState = reaction.vote || 'none';
        const updateVoteUi = () => {
            voteCount.textContent = String(getDisplayVoteCount(post, { ...reaction, vote: voteState }));
            upvoteButton.classList.toggle('active', voteState === 'up');
            downvoteButton.classList.toggle('active', voteState === 'down');
        };

        const handleVote = (nextState) => {
            if (voteState === nextState) {
                voteState = 'none';
            } else {
                voteState = nextState;
            }
            updatePostReaction(post.id, { vote: voteState });
            updateVoteUi();
            showToast(voteState === 'none' ? 'Đã bỏ bình chọn.' : voteState === 'up' ? 'Đã tăng điểm cho bài viết.' : 'Đã giảm điểm cho bài viết.', 'info');
        };

        upvoteButton.addEventListener('click', () => handleVote('up'));
        downvoteButton.addEventListener('click', () => handleVote('down'));
        updateVoteUi();
    }

    if (likeButton) {
        likeButton.addEventListener('click', () => {
            const currentlyLiked = likeButton.dataset.liked === 'true';
            const nextLiked = !currentlyLiked;
            const updatedReaction = updatePostReaction(post.id, { liked: nextLiked });
            likeButton.dataset.liked = String(nextLiked);
            likeButton.classList.toggle('liked', nextLiked);
            likeButton.innerHTML = `<i class="${nextLiked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i><span class="like-count">${getDisplayLikeCount(post, updatedReaction)}</span>`;
            createActivityNotification(nextLiked ? 'Đã thích bài viết' : 'Đã bỏ thích bài viết', `Bạn vừa ${nextLiked ? 'thích' : 'bỏ thích'} bài viết "${post.title || 'một bài viết'}".`);
            showToast(nextLiked ? 'Đã thích bài viết.' : 'Đã bỏ thích bài viết.', 'info');
        });
    }

    if (shareButton) {
        shareButton.addEventListener('click', async () => {
            try {
                if (navigator.share) {
                    await navigator.share({ title: post.title, text: post.content, url: window.location.href });
                } else {
                    await navigator.clipboard.writeText(window.location.href);
                }
                createActivityNotification('Đã chia sẻ bài viết', `Bạn vừa chia sẻ bài viết "${post.title || 'một bài viết'}".`);
                showToast('Đã chia sẻ bài viết.', 'success');
            } catch (error) {
                showToast('Không thể chia sẻ lúc này.', 'error');
            }
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            toggleSavedPost(post.id);
            saveButton.classList.toggle('saved', isPostSaved(post.id));
            saveButton.innerHTML = `<i class="${isPostSaved(post.id) ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i><span>${isPostSaved(post.id) ? 'Đã lưu' : 'Lưu'}</span>`;
            showToast(isPostSaved(post.id) ? 'Đã lưu bài viết.' : 'Đã bỏ lưu bài viết.', 'info');
        });
    }

    if (menuButton && quickActionsMenu) {
        menuButton.addEventListener('click', () => {
            quickActionsMenu.classList.toggle('hidden');
        });

        quickActionsMenu.querySelectorAll('.quick-action-btn').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                quickActionsMenu.classList.add('hidden');
                if (action === 'detail') {
                    window.location.href = `post-detail.html?id=${post.id}`;
                } else if (action === 'save') {
                    saveButton?.click();
                } else if (action === 'share') {
                    shareButton?.click();
                }
            });
        });
    }

    if (commentForm) {
        commentForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!isLoggedIn()) {
                showToast('Bạn cần đăng nhập để bình luận.', 'info');
                const createPostCard = document.getElementById('createPostCard');
                if (createPostCard) {
                    createPostCard.classList.remove('hidden');
                    createPostCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                return;
            }

            const username = (usernameInput.value || '').trim() || 'Khách vãng lai';
            const messageInput = article.querySelector('.comment-input');
            const message = (messageInput.value || '').trim();

            if (!message) {
                showToast('Vui lòng viết một bình luận trước khi gửi.', 'error');
                return;
            }

            try {
                await createComment({
                    postId: post.id,
                    username,
                    message,
                    createdAt: new Date().toISOString(),
                });
                createActivityNotification('Đã bình luận', `Bạn vừa bình luận trên bài viết "${post.title || 'một bài viết'}".`);

                post.comments = (post.comments || 0) + 1;
                if (commentCountSpan) commentCountSpan.textContent = post.comments;
                if (messageInput) messageInput.value = '';
                await renderCommentsForPost(post.id, commentList, commentCountSpan);
                if (commentsPanel && commentsPanel.classList.contains('hidden')) {
                    commentsPanel.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Lỗi gửi bình luận:', error);
                showToast('Không thể gửi bình luận. Vui lòng thử lại.', 'error');
            }
        });
    }

    return article;
}

// =======================================================
// HÀM XỬ LÝ BÀI VIẾT VÀ FILTER
// =======================================================

async function loadPosts(postFeed) {
    if (!postFeed) return;

    try {
        const posts = await getAllPosts();
        allLoadedPosts = posts.filter(post => post.approved === undefined || post.approved === true || post.approved === 'true');
        await applyPostFilters(postFeed);
        renderSavedPosts();
    } catch (error) {
        console.error('Lỗi tải bài viết:', error);
        postFeed.innerHTML = '<div class="empty-state">Không thể tải bài viết. Vui lòng thử lại sau.</div>';
    }
}

async function applyPostFilters(postFeed) {
    if (!postFeed) return;

    const searchValue = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const mode = window.currentPostFilter || 'trending';

    let filteredPosts = [...allLoadedPosts];

    if (searchValue) {
        filteredPosts = filteredPosts.filter(post => {
            const haystack = `${post.title || ''} ${post.content || ''} ${post.community || ''} ${post.author || ''}`.toLowerCase();
            return haystack.includes(searchValue);
        });
    }

    filteredPosts = filteredPosts.sort((a, b) => {
        const aLikes = Number(a.likes || 0);
        const bLikes = Number(b.likes || 0);
        const aComments = Number(a.comments || 0);
        const bComments = Number(b.comments || 0);
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();

        if (mode === 'top') return (bLikes + bComments * 2) - (aLikes + aComments * 2);
        if (mode === 'newest') return bTime - aTime;
        return (bLikes + bComments * 2 + (bTime / 100000000)) - (aLikes + aComments * 2 + (aTime / 100000000));
    });

    const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * POSTS_PER_PAGE;
    const pagePosts = filteredPosts.slice(start, start + POSTS_PER_PAGE);

    renderPaginationControls(filteredPosts.length);

    if (pagePosts.length > 0) {
        postFeed.innerHTML = '';
        for (const post of pagePosts) {
            const postElement = await createPostElement(post);
            postFeed.appendChild(postElement);
        }
    } else {
        postFeed.innerHTML = '<div class="empty-state">Không tìm thấy bài viết phù hợp.</div>';
    }
}

function renderPaginationControls(totalItems) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / POSTS_PER_PAGE));
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const pages = [];
    for (let i = 1; i <= totalPages; i += 1) {
        pages.push(`<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
    }

    container.innerHTML = `
        <button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>← Trước</button>
        <div class="page-numbers">${pages.join('')}</div>
        <button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>Sau →</button>
    `;

    container.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', () => {
            const pageValue = button.getAttribute('data-page');
            if (pageValue === 'prev') {
                if (currentPage > 1) currentPage -= 1;
            } else if (pageValue === 'next') {
                if (currentPage < totalPages) currentPage += 1;
            } else {
                currentPage = Number(pageValue);
            }
            const postFeed = document.querySelector('.post-feed');
            if (postFeed) {
                void applyPostFilters(postFeed);
            }
        });
    });
}

// =======================================================
// HÀM XỬ LÝ TẠO BÀI VIẾT
// =======================================================

async function handleCreatePost(event) {
    event.preventDefault();

    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const communityInput = document.getElementById('postCommunity');
    const imageInput = document.getElementById('postImage');
    const postFeed = document.querySelector('.post-feed');
    const createPostCardElement = document.getElementById('createPostCard');

    if (!isLoggedIn()) {
        alert('Bạn cần đăng nhập để tạo bài viết.');
        window.location.href = 'login.html?redirect=create-post.html';
        return;
    }

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
        showToast('Vui lòng nhập tiêu đề và nội dung bài viết.', 'error');
        return;
    }

    try {
        await createPost(newPost);
        event.target.reset();
        if (createPostCardElement) {
            createPostCardElement.classList.add('hidden');
        }

        if (isAdmin()) {
            showToast('Bài viết đã được đăng ngay.', 'success');
            showOSNotification("BlogHub", "Bài viết của bạn đã được xuất bản thành công!");
        } else {
            showToast('Bài viết của bạn đã được gửi đến admin để duyệt.', 'info');
            showOSNotification("BlogHub", "Bài viết đã được gửi đến Admin để chờ duyệt!");
        }

        if (window.location.pathname.includes('create-post.html')) {
            window.location.href = 'index.html';
            return;
        }

        if (isAdmin() && postFeed) {
            await loadPosts(postFeed);
        }

    } catch (error) {
        console.error('Lỗi tạo bài viết:', error);
        showToast('Không thể tạo bài viết. Vui lòng thử lại.', 'error');
    }
}

// =======================================================
// HÀM XỬ LÝ STATS
// =======================================================

async function updateForumStats() {
    const heroTotalUsers = document.getElementById('hero-total-users');
    const heroOnlineUsers = document.getElementById('hero-online-users');
    const heroTotalPosts = document.getElementById('hero-total-posts');
    const widgetTotalUsers = document.getElementById('widget-total-users');
    const widgetOnlineUsers = document.getElementById('widget-online-users');

    try {
        const posts = await getAllPosts();
        
        const approvedPostsCount = posts.filter(post => post.approved === undefined || post.approved === true || post.approved === 'true').length;
        
        const uniqueAuthors = new Set(posts.map(p => p.author).filter(Boolean));
        const baseUsers = uniqueAuthors.size > 0 ? uniqueAuthors.size : 1;
        const calculatedTotalUsers = baseUsers * 3 + 4; 
        
        const calculatedOnlineUsers = Math.floor(calculatedTotalUsers * 0.35) + Math.floor(Math.random() * 3) + 1;

        if (heroTotalUsers) heroTotalUsers.textContent = calculatedTotalUsers;
        if (heroOnlineUsers) heroOnlineUsers.textContent = calculatedOnlineUsers;
        if (heroTotalPosts) heroTotalPosts.textContent = approvedPostsCount;

        if (widgetTotalUsers) widgetTotalUsers.textContent = calculatedTotalUsers;
        if (widgetOnlineUsers) widgetOnlineUsers.textContent = calculatedOnlineUsers;

    } catch (error) {
        console.error("Lỗi khi đồng bộ số liệu trang chủ:", error);
        if (heroTotalUsers) heroTotalUsers.textContent = "12";
        if (heroOnlineUsers) heroOnlineUsers.textContent = "3";
        if (heroTotalPosts) heroTotalPosts.textContent = "6";
        if (widgetTotalUsers) widgetTotalUsers.textContent = "12";
        if (widgetOnlineUsers) widgetOnlineUsers.textContent = "3";
    }
}

// =======================================================
// HÀM RENDER HEADER & NOTIFICATIONS
// =======================================================

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

    notifToggle.addEventListener('click', () => {
        let allNotifs = [];
        if (currentUser) {
            allNotifs.push(...getUserNotifications(currentUser.username || currentUser.nickname || ''));
        }
        if (isAdmin()) {
            allNotifs.push(...getServerNotifications());
        }
        allNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latestNotifs = allNotifs.slice(0, 3);

        if ("Notification" in window) {
            if (Notification.permission === "default") {
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
                if (latestNotifs.length > 0) {
                    latestNotifs.forEach(n => showOSNotification(n.title, n.message));
                }
            }
        }

        notifDropdown.classList.toggle('hidden');
        
        if (!notifDropdown.classList.contains('hidden')) {
            renderNotifList(allNotifs);
            if (currentUser) {
                markAllUserNotificationsRead(currentUser.username || currentUser.nickname || '');
            }
            notifCount.classList.add('hidden');
        }
    });

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

// =======================================================
// HÀM KHỞI TẠO INTERACTIVE ELEMENTS
// =======================================================

function initializeInteractiveElements() {
    syncCommunityButtons();

    document.querySelectorAll('.btn-join, .btn-join-outline, .btn-follow').forEach(button => {
        button.addEventListener('click', () => {
            const label = button.dataset.community || button.textContent.replace(/\s+/g, ' ').trim();
            handleJoinCommunityToggle(button, label);
        });
    });

    document.querySelectorAll('a[href="#"]').forEach(link => {
        if (link.classList.contains('js-open-create-post')) return;

        link.addEventListener('click', (event) => {
            event.preventDefault();
            const label = (link.textContent || '').replace(/\s+/g, ' ').trim();
            const community = label.replace(/^r\//, '').trim() || 'VienTuong';
            window.location.href = `subreddit.html?community=${encodeURIComponent(community)}`;
            showToast(`Đang mở cộng đồng ${community}.`, 'info');
        });
    });

    const layoutButton = document.querySelector('.layout-btn');
    if (layoutButton) {
        const feed = document.querySelector('.post-feed');
        const compactMode = localStorage.getItem('feedCompactMode') === 'true';
        if (feed) {
            feed.classList.toggle('compact-view', compactMode);
            layoutButton.classList.toggle('active', compactMode);
        }

        layoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            if (feed) {
                const nextState = !feed.classList.contains('compact-view');
                feed.classList.toggle('compact-view', nextState);
                layoutButton.classList.toggle('active', nextState);
                localStorage.setItem('feedCompactMode', String(nextState));
                showToast(nextState ? 'Đã chuyển sang xem thu gọn.' : 'Đã quay lại bố cục đầy đủ.', 'info');
            }
        });
    }
}

// =======================================================
// HÀM XỬ LÝ TRANG CỘNG ĐỒNG (SUBREDDIT)
// =======================================================

function renderSidebarCommunityList(activeCommunityName) {
    const list = document.getElementById('sidebarCommunityList');
    if (!list) return;

    list.innerHTML = KNOWN_COMMUNITIES.map(name => {
        const isActive = name.toLowerCase() === activeCommunityName.toLowerCase();
        return `
            <li>
                <a href="subreddit.html?community=${encodeURIComponent(name)}" class="${isActive ? 'active' : ''}">
                    <i class="fa-solid fa-hashtag sub-icon"></i> r/ ${escapeHtml(name)}
                </a>
            </li>
        `;
    }).join('');
}

async function initSubredditPage(postFeed, communityName) {
    const displayTag = `r/${communityName}`;

    const subPageTitle = document.getElementById('subPageTitle');
    if (subPageTitle) subPageTitle.textContent = `${communityName} - Diễn Đàn Viễn Tưởng`;

    const subDisplayName = document.getElementById('subDisplayName');
    if (subDisplayName) subDisplayName.textContent = communityName;

    const subSlugName = document.getElementById('subSlugName');
    if (subSlugName) subSlugName.textContent = `${displayTag} • cộng đồng dành cho ${communityName}`;

    const widgetSubName = document.getElementById('widgetSubName');
    if (widgetSubName) widgetSubName.textContent = `Giới thiệu ${displayTag}`;

    const widgetSubDesc = document.getElementById('widgetSubDesc');
    if (widgetSubDesc) widgetSubDesc.textContent = `Không gian thảo luận và chia sẻ nội dung xoay quanh chủ đề ${communityName}.`;

    const widgetSubRules = document.getElementById('widgetSubRules');
    if (widgetSubRules) {
        widgetSubRules.innerHTML = `
            <li>Tôn trọng tác quyền của tác giả.</li>
            <li>Góp ý văn minh, không xúc phạm.</li>
            <li>Bắt buộc gắn thẻ Spoil khi tiết lộ nội dung.</li>
            <li>Tranh luận không công kích cá nhân.</li>
        `;
    }

    renderSidebarCommunityList(communityName);

    if (!postFeed) return;

    try {
        const posts = await getAllPosts();
        const approvedPosts = posts.filter(post => post.approved === undefined || post.approved === true || post.approved === 'true');
        const filteredPosts = approvedPosts.filter(post => {
            const postCommunity = String(post.community || '').replace(/^r\//, '').trim().toLowerCase();
            return postCommunity === communityName.toLowerCase();
        });

        allLoadedPosts = filteredPosts;

        const widgetSubMembers = document.getElementById('widgetSubMembers');
        const widgetSubOnline = document.getElementById('widgetSubOnline');
        if (widgetSubMembers) widgetSubMembers.textContent = filteredPosts.length * 7 + 12;
        if (widgetSubOnline) widgetSubOnline.textContent = Math.floor(Math.random() * 5) + 1;

        if (filteredPosts.length === 0) {
            postFeed.innerHTML = `<div class="empty-state">Chưa có bài viết nào trong ${escapeHtml(displayTag)}.</div>`;
            return;
        }

        postFeed.innerHTML = '';
        for (const post of filteredPosts) {
            const postElement = await createPostElement(post);
            postFeed.appendChild(postElement);
        }
    } catch (error) {
        console.error('Lỗi tải bài viết theo cộng đồng:', error);
        postFeed.innerHTML = '<div class="empty-state">Không thể tải bài viết cho cộng đồng này.</div>';
    }
}

// =======================================================
// HÀM KHỞI TẠO TRANG CHI TIẾT BÀI VIẾT
// =======================================================

async function initPostDetailPage() {
    const wrapper = document.getElementById('postDetailWrapper');
    if (!wrapper) return;

    const postId = new URLSearchParams(window.location.search).get('id');
    if (!postId) {
        showToast('Không tìm thấy bài viết để hiển thị.', 'error');
        return;
    }

    const posts = await getAllPosts();
    const post = posts.find(item => String(item.id) === String(postId));

    if (!post) {
        showToast('Bài viết này không tồn tại hoặc đã bị xóa.', 'error');
        return;
    }

    document.getElementById('detailTitle').textContent = post.title || 'Bài viết';
    document.getElementById('detailAuthor').textContent = post.author || 'Người dùng';
    document.getElementById('detailCommunity').textContent = post.community || 'r/VienTuong';
    document.getElementById('detailTime').textContent = formatTime(post.createdAt);
    document.getElementById('detailContent').innerHTML = `<p>${escapeHtml(post.content || 'Không có nội dung.')}</p>`;
    const detailImage = document.getElementById('detailImage');
    if (post.image) {
        detailImage.src = post.image;
        detailImage.classList.remove('hidden');
    } else {
        detailImage.classList.add('hidden');
    }

    document.getElementById('detailAvatar').src = post.avatar || 'https://via.placeholder.com/40';
    document.getElementById('detailUpvotes').textContent = post.likes || 0;
    document.getElementById('detailCommentCount').textContent = post.comments || 0;
    document.getElementById('commentingAs').textContent = getCurrentUser()?.nickname || getCurrentUser()?.username || 'Tài khoản';

    const commentList = document.getElementById('commentListContainer');
    const submitCommentButton = document.getElementById('submitCommentBtn');
    const commentInput = document.getElementById('commentInput');
    const detailSaveButton = document.querySelector('.detail-save-btn');
    const detailShareButton = document.querySelector('.detail-share-btn');
    const detailCommentButton = document.querySelector('.detail-comment-btn');
    const upvoteButton = document.querySelector('.upvote');
    const downvoteButton = document.querySelector('.downvote');
    const reaction = getPostReaction(post.id);

    if (detailSaveButton) {
        detailSaveButton.addEventListener('click', () => {
            toggleSavedPost(post.id);
            detailSaveButton.classList.toggle('saved', isPostSaved(post.id));
            detailSaveButton.innerHTML = `<i class="${isPostSaved(post.id) ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i> ${isPostSaved(post.id) ? 'Đã lưu' : 'Lưu bài'}`;
            showToast(isPostSaved(post.id) ? 'Đã lưu bài viết.' : 'Đã bỏ lưu bài viết.', 'info');
        });
    }

    if (detailShareButton) {
        detailShareButton.addEventListener('click', async () => {
            try {
                if (navigator.share) {
                    await navigator.share({ title: post.title, text: post.content, url: window.location.href });
                } else {
                    await navigator.clipboard.writeText(window.location.href);
                }
                createActivityNotification('Đã chia sẻ bài viết', `Bạn vừa chia sẻ bài viết "${post.title || 'một bài viết'}".`);
                showToast('Đã chia sẻ bài viết.', 'success');
            } catch (error) {
                showToast('Không thể chia sẻ lúc này.', 'error');
            }
        });
    }

    if (detailCommentButton) {
        detailCommentButton.addEventListener('click', () => {
            document.getElementById('commentInput')?.focus();
            document.querySelector('.comment-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    if (upvoteButton) {
        const updateDetailVoteUi = (nextState) => {
            const helper = { ...reaction, vote: nextState };
            document.getElementById('detailUpvotes').textContent = String(getDisplayVoteCount(post, helper));
            upvoteButton.classList.toggle('active', nextState === 'up');
            downvoteButton.classList.toggle('active', nextState === 'down');
        };

        upvoteButton.addEventListener('click', () => {
            const nextState = reaction.vote === 'up' ? 'none' : 'up';
            updatePostReaction(post.id, { vote: nextState });
            updateDetailVoteUi(nextState);
            showToast(nextState === 'none' ? 'Đã bỏ bình chọn.' : 'Đã tăng điểm cho bài viết.', 'info');
        });
        updateDetailVoteUi(reaction.vote || 'none');
    }

    if (downvoteButton) {
        downvoteButton.addEventListener('click', () => {
            const nextState = reaction.vote === 'down' ? 'none' : 'down';
            updatePostReaction(post.id, { vote: nextState });
            const helper = { ...reaction, vote: nextState };
            document.getElementById('detailUpvotes').textContent = String(getDisplayVoteCount(post, helper));
            upvoteButton.classList.toggle('active', nextState === 'up');
            downvoteButton.classList.toggle('active', nextState === 'down');
            showToast(nextState === 'none' ? 'Đã bỏ bình chọn.' : 'Đã giảm điểm cho bài viết.', 'info');
        });
    }

    if (submitCommentButton && commentInput) {
        submitCommentButton.addEventListener('click', async () => {
            const value = commentInput.value.trim();
            if (!value) {
                showToast('Bạn cần nhập nội dung bình luận.', 'error');
                return;
            }
            try {
                await createComment({ postId: post.id, username: getCurrentUser()?.nickname || getCurrentUser()?.username || 'Khách', message: value, createdAt: new Date().toISOString() });
                createActivityNotification('Đã bình luận', `Bạn vừa bình luận trên bài viết "${post.title || 'một bài viết'}".`);
                commentInput.value = '';
                await renderCommentsForPost(post.id, commentList, document.getElementById('detailCommentCount'));
                showToast('Đã đăng bình luận.', 'success');
            } catch (error) {
                showToast('Không thể đăng bình luận lúc này.', 'error');
            }
        });
    }

    await renderCommentsForPost(post.id, commentList, document.getElementById('detailCommentCount'));
}

// =======================================================
// HÀM KHỞI TẠO TRANG TẠO BÀI VIẾT
// =======================================================

function initCreatePostPage() {
    const form = document.getElementById('createPostForm');
    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const communityInput = document.getElementById('postCommunity');
    const imageInput = document.getElementById('postImage');
    const saveDraftButton = document.querySelector('.btn-save-draft');
    const cancelButton = document.querySelector('.btn-cancel');
    const draftButton = document.querySelector('.btn-draft-top');

    if (!form || !titleInput || !contentInput) return;

    const updateDraftBadge = () => {
        const badge = document.querySelector('.draft-count');
        if (badge) {
            const drafts = getStoredDrafts();
            badge.textContent = Object.keys(drafts).length;
        }
    };

    const saveDraft = () => {
        const draft = {
            title: titleInput.value.trim(),
            content: contentInput.value.trim(),
            community: communityInput?.value.trim() || '',
            image: imageInput?.value.trim() || '',
            savedAt: new Date().toISOString(),
        };
        saveDraftToStorage(draft);
        updateDraftBadge();
        showToast('Đã lưu bản nháp thành công.', 'success');
    };

    const restoreDraft = () => {
        const draft = getStoredDrafts()[getCurrentDraftKey()] || null;
        if (!draft) {
            updateDraftBadge();
            return;
        }

        titleInput.value = draft.title || '';
        contentInput.value = draft.content || '';
        if (communityInput) communityInput.value = draft.community || 'r/Viễn tưởng';
        if (imageInput) imageInput.value = draft.image || '';
        updateDraftBadge();
        showToast('Đã khôi phục bản nháp gần nhất.', 'info');
    };

    const autoSaveDraft = () => {
        const draft = {
            title: titleInput.value.trim(),
            content: contentInput.value.trim(),
            community: communityInput?.value.trim() || '',
            image: imageInput?.value.trim() || '',
            savedAt: new Date().toISOString(),
        };
        saveDraftToStorage(draft, true);
        updateDraftBadge();
    };

    [titleInput, contentInput, communityInput, imageInput].filter(Boolean).forEach(input => {
        input.addEventListener('input', autoSaveDraft);
    });

    if (saveDraftButton) saveDraftButton.addEventListener('click', saveDraft);
    if (cancelButton) {
        cancelButton.addEventListener('click', (event) => {
            event.preventDefault();
            form.reset();
            if (communityInput) communityInput.value = 'r/Viễn tưởng';
            clearDraft();
            updateDraftBadge();
            showToast('Đã hủy và xóa bản nháp đang soạn.', 'info');
        });
    }
    if (draftButton) draftButton.addEventListener('click', restoreDraft);

    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
            button.classList.add('active');
            const selected = button.textContent.trim();
            if (selected.includes('Hình ảnh')) {
                contentInput.placeholder = 'Mô tả hình ảnh hoặc video bạn muốn đăng...';
            } else if (selected.includes('Link')) {
                contentInput.placeholder = 'Chia sẻ liên kết và nêu ngắn gọn ý nghĩa của nó...';
            } else {
                contentInput.placeholder = 'Nội dung bài viết (Tùy chọn)';
            }
            showToast(`Đã chuyển sang ${selected}.`, 'info');
        });
    });

    document.querySelectorAll('.tool-btn').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.querySelector('i')?.className || '';
            const prefix = action.includes('fa-bold') ? '**' : action.includes('fa-italic') ? '*' : action.includes('fa-link') ? '[text](url)' : action.includes('fa-strikethrough') ? '~~' : action.includes('fa-heading') ? '## ' : action.includes('fa-list-ul') ? '- ' : action.includes('fa-list-ol') ? '1. ' : '';
            insertEditorText(contentInput, prefix);
        });
    });

    document.querySelectorAll('.option-btn').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            const label = button.textContent.trim();
            if (button.classList.contains('active')) {
                showToast(`Đã bật nhãn ${label}.`, 'info');
            } else {
                showToast(`Đã tắt nhãn ${label}.`, 'info');
            }
        });
    });

    document.querySelector('.flair-btn')?.addEventListener('click', () => {
        const flair = window.prompt('Nhập flair cho bài viết:', 'Câu chuyện mới');
        if (flair) {
            const currentValue = contentInput.value.trim();
            contentInput.value = `${currentValue}\n[Flair: ${flair}]`.trim();
            showToast(`Đã thêm flair: ${flair}`, 'success');
        }
    });

    updateDraftBadge();
    restoreDraft();
}

// =======================================================
// HÀM XỬ LÝ LOGOUT
// =======================================================

function handleLogout() {
    logout();
    window.location.href = 'index.html';
}

// =======================================================
// HÀM XỬ LÝ MỞ TẠO BÀI VIẾT
// =======================================================

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

// =======================================================
// DOMContentLoaded - KHỞI TẠO TRANG
// =======================================================

document.addEventListener('DOMContentLoaded', async () => {
    const postFeed = document.querySelector('.post-feed');
    const createPostForm = document.getElementById('createPostForm');
    const openCreatePostButtons = document.querySelectorAll('.js-open-create-post');
    const createPostCard = document.getElementById('createPostCard');
    const logoutButton = document.getElementById('logoutButton');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    openCreatePostButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            handleOpenCreatePost(createPostCard);
        });
    });

    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreatePost);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    if (filterButtons.length) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const mode = button.dataset.filter || 'trending';
                window.currentPostFilter = mode;
                currentPage = 1;
                void applyPostFilters(postFeed);
            });
        });
    }

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            currentPage = 1;
            void applyPostFilters(postFeed);
        });
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            void applyPostFilters(postFeed);
        });
    }

    const subDisplayNameEl = document.getElementById('subDisplayName');
    const isSubredditPage = Boolean(subDisplayNameEl);
    let currentCommunityName = '';

    if (isSubredditPage) {
        const params = new URLSearchParams(window.location.search);
        currentCommunityName = (params.get('community') || 'VienTuong').replace(/^r\//, '').trim();

        const btnJoinSub = document.getElementById('btnJoinSub');
        if (btnJoinSub) {
            btnJoinSub.dataset.community = currentCommunityName;
        }
    }

    window.currentPostFilter = 'trending';
    initializeInteractiveElements();
    renderHeaderUser();

    const isStandaloneCreatePostPage = window.location.pathname.endsWith('create-post.html');

    if (document.getElementById('postDetailWrapper')) {
        await initPostDetailPage();
    } else if (isStandaloneCreatePostPage) {
        initCreatePostPage();
    } else if (isSubredditPage) {
        await initSubredditPage(postFeed, currentCommunityName);
    } else {
        await loadPosts(postFeed);
    }

    await updateForumStats();
    renderNotifications();
});