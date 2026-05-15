import { getAllComments, createComment, getCurrentUser, isLoggedIn } from './api.js';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function renderComments() {
  const commentList = document.getElementById('comment-list');
  if (!commentList) return;

  const comments = await getAllComments();
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
}

document.addEventListener('DOMContentLoaded', async function () {
  const commentForm = document.querySelector('.comment-form');
  const usernameInput = document.getElementById('comment-username');
  const messageInput = document.getElementById('comment-input');

  const currentUser = getCurrentUser();
  if (currentUser && usernameInput) {
    usernameInput.value = currentUser.nickname || currentUser.username || '';
    usernameInput.readOnly = true;
  }

  await renderComments();

  if (!commentForm) return;

  commentForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    const username = (usernameInput.value || '').trim() || 'Khách vãng lai';
    const message = messageInput.value.trim();

    if (!message) {
      alert('Vui lòng viết một bình luận trước khi gửi.');
      return;
    }

    try {
      await createComment({
        username,
        message,
        createdAt: new Date().toISOString(),
      });
      messageInput.value = '';
      await renderComments();
    } catch (error) {
      console.error('Lỗi gửi bình luận:', error);
      alert('Không thể gửi bình luận. Vui lòng thử lại.');
    }
  });
});
