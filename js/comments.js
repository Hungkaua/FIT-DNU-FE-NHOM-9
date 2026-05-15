const COMMENT_STORAGE_KEY = 'blog-comments';

function getSavedComments() {
  const saved = localStorage.getItem(COMMENT_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveComments(comments) {
  localStorage.setItem(COMMENT_STORAGE_KEY, JSON.stringify(comments));
}

function renderComments() {
  const commentList = document.getElementById('comment-list');
  if (!commentList) return;

  const comments = getSavedComments();
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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', function () {
  const commentForm = document.querySelector('.comment-form');
  const usernameInput = document.getElementById('comment-username');
  const messageInput = document.getElementById('comment-input');

  renderComments();

  if (!commentForm) return;

  commentForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const username = usernameInput.value.trim() || 'Khách vãng lai';
    const message = messageInput.value.trim();

    if (!message) {
      alert('Vui lòng viết một bình luận trước khi gửi.');
      return;
    }

    const comments = getSavedComments();
    comments.push({
      username,
      message,
      createdAt: new Date().toISOString()
    });

    saveComments(comments);
    renderComments();
    messageInput.value = '';
  });
});
