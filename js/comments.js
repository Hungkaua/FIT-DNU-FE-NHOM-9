import {
    getCommentsByPost,
    createComment,
    getCurrentUser
} from "./api.js";
import { showToast } from "./ui.js";

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const postId = new URLSearchParams(window.location.search).get("id");

async function renderComments() {
    const commentList = document.getElementById("comment-list");
    if (!commentList) return;

    const comments = await getCommentsByPost(postId);

    if (comments.length === 0) {
        commentList.innerHTML =
            '<p class="no-comments">Chưa có bình luận nào.</p>';
        return;
    }

    commentList.innerHTML = comments
        .slice()
        .reverse()
        .map(
            (comment) => `
        <div class="comment-item">
            <div class="comment-header">
                <strong>${escapeHtml(comment.username)}</strong>
                <span>${new Date(comment.createdAt).toLocaleString("vi-VN")}</span>
            </div>
            <p>${escapeHtml(comment.message)}</p>
        </div>
    `
        )
        .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
    const commentForm = document.querySelector(".comment-form");
    const usernameInput = document.getElementById("comment-username");
    const messageInput = document.getElementById("comment-input");

    const currentUser = getCurrentUser();

    if (currentUser && usernameInput) {
        usernameInput.value =
            currentUser.nickname || currentUser.username;
        usernameInput.readOnly = true;
    }

    await renderComments();

    if (!commentForm) return;

    commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username =
            usernameInput.value.trim() || "Khách";

        const message = messageInput.value.trim();

        if (!message) {
            showToast("Nhập nội dung bình luận.", "error");
            return;
        }

        await createComment({
            postId,
            username,
            message,
            createdAt: new Date().toISOString()
        });

        messageInput.value = "";

        await renderComments();
    });
});