// URL API cố định - ĐÚNG VỚI CẤU TRÚC CỦA BẠN
// POST_API_URL: cho bài viết
// LOGIN_API_URL: cho chức năng đăng nhập/đăng ký người dùng
const api_url = {
    POST_API_URL: "https://69fd353c30ad0a6fd1c09463.mockapi.io/apis/Post",
    COMMENT_API_URL: "https://69fd353c30ad0a6fd1c09463.mockapi.io/apis/Comment",
    LOGIN_API_URL: "https://6a05f22eaa826ca75c0ae2f4.mockapi.io/apis/login",
};

// ========== NOTIFICATIONS (localStorage-backed) ==========
function getServerNotifications() {
    try {
        return JSON.parse(localStorage.getItem('serverNotifications') || '[]');
    } catch (e) {
        return [];
    }
}

function createServerNotification(notification) {
    const list = getServerNotifications();
    const normalized = Object.assign({ createdAt: new Date().toISOString() }, notification);
    list.unshift(normalized);
    const trimmed = list.slice(0, 25);
    localStorage.setItem('serverNotifications', JSON.stringify(trimmed));
    return trimmed;
}

function getUserNotifications(username) {
    if (!username) return [];
    try {
        return JSON.parse(localStorage.getItem(`userNotifications_${username}`) || '[]');
    } catch (e) {
        return [];
    }
}

function createUserNotification(username, notification) {
    if (!username) return [];
    const key = `userNotifications_${username}`;
    const list = getUserNotifications(username);
    const normalized = Object.assign({ createdAt: new Date().toISOString(), read: false }, notification);
    list.unshift(normalized);
    const trimmed = list.slice(0, 25);
    localStorage.setItem(key, JSON.stringify(trimmed));
    return trimmed;
}

function markAllUserNotificationsRead(username) {
    if (!username) return [];
    const key = `userNotifications_${username}`;
    const list = getUserNotifications(username).map(n => Object.assign({}, n, { read: true }));
    localStorage.setItem(key, JSON.stringify(list.slice(0, 25)));
    return list;
}

// ========== BASE FUNCTIONS ==========
async function get(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
    return await response.json();
}

async function postData(url, info) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
    });
    if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
    return await response.json();
}

async function deleteData(url, id) {
    const response = await fetch(`${url}/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
    return await response.json();
}

async function patchData(url, id, info) {
    const response = await fetch(`${url}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info),
    });
    if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
    return await response.json();
}

// ========== POST FUNCTIONS ==========
async function getAllPosts() {
    try {
        const posts = await get(api_url.POST_API_URL);
        return Array.isArray(posts) ? posts : [];
    } catch (error) {
        console.error("Lỗi lấy bài viết:", error);
        return [];
    }
}

async function getPendingPosts() {
    try {
        const posts = await get(`${api_url.POST_API_URL}?approved=false`);
        return Array.isArray(posts) ? posts : [];
    } catch (error) {
        console.error("Lỗi lấy bài viết chờ duyệt:", error);
        return [];
    }
}

async function createPost(data) {
    return await postData(api_url.POST_API_URL, data);
}

async function approvePost(id) {
    return await patchData(api_url.POST_API_URL, id, { approved: true, status: 'approved' });
}

async function deletePost(id) {
    return await deleteData(api_url.POST_API_URL, id);
}

// ========== COMMENT FUNCTIONS ==========
const LOCAL_COMMENTS_KEY = 'localComments';

function getStoredComments() {
    if (typeof localStorage === 'undefined') return [];
    try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_COMMENTS_KEY) || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        console.error('Lỗi đọc bình luận cục bộ:', error);
        return [];
    }
}

function saveStoredComments(comments) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
    } catch (error) {
        console.error('Lỗi lưu bình luận cục bộ:', error);
    }
}

function normalizeComment(comment) {
    if (!comment || typeof comment !== 'object') return null;
    return {
        ...comment,
        id: comment.id || `${comment.postId || 'post'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        postId: comment.postId ?? '',
        username: comment.username || 'Khách vãng lai',
        message: comment.message || '',
        createdAt: comment.createdAt || new Date().toISOString(),
    };
}

function mergeComments(apiComments, localComments) {
    const merged = [...localComments, ...apiComments]
        .map(normalizeComment)
        .filter(Boolean);

    const uniqueComments = [];
    const seen = new Set();

    merged.forEach(comment => {
        const key = `${comment.postId || ''}:${comment.id || ''}:${comment.message || ''}:${comment.createdAt || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueComments.push(comment);
        }
    });

    return uniqueComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function getAllComments() {
    try {
        const comments = await get(api_url.COMMENT_API_URL);
        const apiComments = Array.isArray(comments) ? comments : [];
        const mergedComments = mergeComments(apiComments, getStoredComments());
        saveStoredComments(mergedComments);
        return mergedComments;
    } catch (error) {
        console.error("Lỗi lấy bình luận:", error);
        return getStoredComments();
    }
}

async function createComment(data) {
    const localComment = normalizeComment({
        ...data,
        createdAt: data?.createdAt || new Date().toISOString(),
    });

    if (localComment) {
        const currentComments = getStoredComments();
        currentComments.push(localComment);
        saveStoredComments(currentComments);
    }

    try {
        const createdComment = await postData(api_url.COMMENT_API_URL, localComment || data);
        const normalized = normalizeComment(createdComment);

        if (normalized) {
            const storedComments = getStoredComments().filter(comment => {
                const isSameComment = comment.id === normalized.id || (
                    comment.postId === normalized.postId &&
                    comment.message === normalized.message &&
                    comment.createdAt === normalized.createdAt
                );
                return !isSameComment;
            });
            storedComments.push(normalized);
            saveStoredComments(storedComments);
            return normalized;
        }

        return localComment;
    } catch (error) {
        console.error("Lỗi tạo bình luận:", error);
        return localComment;
    }
}

async function getCommentsByPost(postId) {
    const localComments = getStoredComments().filter(comment => String(comment.postId) === String(postId));

    try {
        const comments = await get(`${api_url.COMMENT_API_URL}?postId=${encodeURIComponent(postId)}`);
        const apiComments = Array.isArray(comments) ? comments : [];
        const mergedComments = mergeComments(apiComments, localComments);
        const filteredComments = mergedComments.filter(comment => String(comment.postId) === String(postId));
        saveStoredComments(mergedComments);
        return filteredComments;
    } catch (error) {
        console.error("Lỗi lấy bình luận theo bài viết:", error);
        return localComments;
    }
}

// ========== ADMIN REQUEST FUNCTIONS ==========
async function getPendingAdminRequests() {
    try {
        const users = await get(api_url.LOGIN_API_URL);
        const pendingAdmins = users.filter(u => u.role === "admin" && u.adminApproved === false);
        return Array.isArray(pendingAdmins) ? pendingAdmins : [];
    } catch (error) {
        console.error("Lỗi lấy yêu cầu admin:", error);
        return [];
    }
}

async function approveAdminRequest(userId) {
    return await patchData(api_url.LOGIN_API_URL, userId, { adminApproved: true, status: 'approved' });
}

async function rejectAdminRequest(userId) {
    return await patchData(api_url.LOGIN_API_URL, userId, { role: 'reader', status: 'rejected' });
}

// ========== AUTH FUNCTIONS (DÙNG LOGIN API) ==========

// ĐĂNG NHẬP
async function login(identifier, password) {
    try {
        // GET toàn bộ users từ login endpoint
        const users = await get(api_url.LOGIN_API_URL);

        if (!Array.isArray(users) || users.length === 0) {
            throw new Error("Không có dữ liệu người dùng");
        }

        // Tìm user theo username hoặc email
        const user = users.find(u => u.username === identifier || u.email === identifier);

        if (!user) {
            throw new Error("Tên đăng nhập hoặc email không tồn tại");
        }

        if (user.password !== password) {
            throw new Error("Mật khẩu không chính xác");
        }

        // Lưu thông tin user (loại bỏ password trước khi lưu)
        const { password: _, ...safeUser } = user;
        localStorage.setItem("currentUser", JSON.stringify(safeUser));

        return safeUser;
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        throw error;
    }
}

// ĐĂNG KÝ
async function register(userData) {
    try {
        // Kiểm tra username đã tồn tại chưa
        const existingUsers = await get(api_url.LOGIN_API_URL);

        if (existingUsers.some(u => u.username === userData.username)) {
            throw new Error("Tên đăng nhập đã được sử dụng!");
        }

        if (existingUsers.some(u => u.email === userData.email)) {
            throw new Error("Email đã được sử dụng!");
        }

        // Tạo user mới (MockAPI tự tạo id)
        const newUser = await postData(api_url.LOGIN_API_URL, userData);

        return newUser;
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        throw error;
    }
}

// ĐĂNG XUẤT
function logout() {
    localStorage.removeItem("currentUser");
}

// LẤY USER HIỆN TẠI
function getCurrentUser() {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
}

// KIỂM TRA ĐĂNG NHẬP
function isLoggedIn() {
    return getCurrentUser() !== null;
}

// KIỂM TRA ADMIN
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === "admin";
}

// BẢO VỆ TRANG ADMIN
function protectAdminPage() {
    const user = getCurrentUser();
    if (!user) {
        alert("Bạn cần đăng nhập để truy cập trang này.");
        window.location.href = "login.html";
        return false;
    }
    if (user.role !== "admin") {
        alert("Bạn không có quyền truy cập trang quản trị.");
        window.location.href = "index.html";
        return false;
    }
    return true;
}

// Export các hàm cần thiết
export { getAllPosts, getPendingPosts, createPost, approvePost, deletePost, getAllComments, getCommentsByPost, createComment, getPendingAdminRequests, approveAdminRequest, rejectAdminRequest, login, register, logout, getCurrentUser, isLoggedIn, isAdmin, protectAdminPage, getServerNotifications, createServerNotification, getUserNotifications, createUserNotification, markAllUserNotificationsRead };
