// api.js - Phiên bản cải tiến với retry và timeout
const api_url = {
    POST_API_URL: "https://69fd353c30ad0a6fd1c09463.mockapi.io/apis/Post",
    COMMENT_API_URL: "https://69fd353c30ad0a6fd1c09463.mockapi.io/apis/Comment",
    LOGIN_API_URL: "https://6a05f22eaa826ca75c0ae2f4.mockapi.io/apis/login",
};

// ========== UTILITY: FETCH VỚI TIMEOUT VÀ RETRY ==========
const DEFAULT_TIMEOUT = 10000; // 10 giây
const MAX_RETRIES = 3;

async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout sau ${timeout}ms - MockAPI không phản hồi`);
        }
        throw error;
    }
}

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetchWithTimeout(url, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            lastError = error;
            console.warn(`Lần thử ${i + 1}/${retries} thất bại:`, error.message);
            if (i < retries - 1) {
                // Chờ với backoff exponential
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

// ========== FALLBACK DATA ==========
const FALLBACK_POSTS = [
    {
        id: 1,
        title: "Chào mừng đến với Diễn Đàn Viễn Tưởng!",
        content: "Đây là bài viết đầu tiên. Hãy chia sẻ những câu chuyện của bạn!",
        author: "Admin",
        community: "r/Viễn tưởng",
        likes: 5,
        comments: 2,
        createdAt: new Date().toISOString(),
        approved: true,
        avatar: "https://via.placeholder.com/40",
        image: ""
    },
    {
        id: 2,
        title: "Top 5 bộ phim sci-fi hay nhất",
        content: "Hãy cùng thảo luận về những bộ phim khoa học viễn tưởng kinh điển...",
        author: "Người dùng 1",
        community: "r/Sci-Fi Phim",
        likes: 3,
        comments: 1,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        approved: true,
        avatar: "https://via.placeholder.com/40",
        image: ""
    },
    {
        id: 3,
        title: "Cách xây dựng thế giới trong truyện fantasy",
        content: "Một số bí quyết để tạo ra thế giới giả tưởng sống động...",
        author: "Người dùng 2",
        community: "r/Góc Sáng Tác",
        likes: 7,
        comments: 4,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        approved: true,
        avatar: "https://via.placeholder.com/40",
        image: ""
    }
];

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

// ========== BASE FUNCTIONS (có retry) ==========
async function get(url) {
    const response = await fetchWithRetry(url);
    return await response.json();
}

async function postData(url, info) {
    const response = await fetchWithRetry(url, {
        method: "POST",
        body: JSON.stringify(info),
    });
    return await response.json();
}

async function deleteData(url, id) {
    const response = await fetchWithRetry(`${url}/${id}`, {
        method: "DELETE",
    });
    return await response.json();
}

async function patchData(url, id, info) {
    const response = await fetchWithRetry(`${url}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(info),
    });
    return await response.json();
}

// ========== POST FUNCTIONS ==========
async function getAllPosts() {
    try {
        const posts = await get(api_url.POST_API_URL);
        return Array.isArray(posts) && posts.length > 0 ? posts : FALLBACK_POSTS;
    } catch (error) {
        console.error("Lỗi lấy bài viết từ API, sử dụng fallback data:", error);
        return FALLBACK_POSTS;
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
    try {
        return await postData(api_url.POST_API_URL, data);
    } catch (error) {
        console.error("Lỗi tạo bài viết, lưu vào local:", error);
        // Fallback: lưu vào localStorage
        const localPosts = JSON.parse(localStorage.getItem('localPosts') || '[]');
        const newPost = { ...data, id: Date.now(), createdAt: new Date().toISOString() };
        localPosts.push(newPost);
        localStorage.setItem('localPosts', JSON.stringify(localPosts));
        return newPost;
    }
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

// ========== USER MANAGEMENT ==========
async function getAllUsers() {
    try {
        const users = await get(api_url.LOGIN_API_URL);
        return Array.isArray(users) ? users : [];
    } catch (error) {
        console.error("Lỗi lấy danh sách thành viên:", error);
        return [];
    }
}

async function deleteUser(id) {
    return await deleteData(api_url.LOGIN_API_URL, id);
}

// ========== AUTH FUNCTIONS ==========
async function login(identifier, password) {
    try {
        const users = await get(api_url.LOGIN_API_URL);
        if (!Array.isArray(users) || users.length === 0) {
            throw new Error("Không có dữ liệu người dùng");
        }
        const user = users.find(u => u.username === identifier || u.email === identifier);
        if (!user) {
            throw new Error("Tên đăng nhập hoặc email không tồn tại");
        }
        if (user.password !== password) {
            throw new Error("Mật khẩu không chính xác");
        }
        const { password: _, ...safeUser } = user;
        localStorage.setItem("currentUser", JSON.stringify(safeUser));
        return safeUser;
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        throw error;
    }
}

async function register(userData) {
    try {
        const existingUsers = await get(api_url.LOGIN_API_URL);
        if (existingUsers.some(u => u.username === userData.username)) {
            throw new Error("Tên đăng nhập đã được sử dụng!");
        }
        if (existingUsers.some(u => u.email === userData.email)) {
            throw new Error("Email đã được sử dụng!");
        }
        const newUser = await postData(api_url.LOGIN_API_URL, userData);
        return newUser;
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        throw error;
    }
}

function logout() {
    localStorage.removeItem("currentUser");
}

function getCurrentUser() {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === "admin";
}

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
export { 
    getAllPosts, 
    getPendingPosts, 
    createPost, 
    approvePost, 
    deletePost, 
    getAllComments, 
    getCommentsByPost, 
    createComment, 
    getPendingAdminRequests, 
    approveAdminRequest, 
    rejectAdminRequest, 
    login, 
    register, 
    logout, 
    getCurrentUser, 
    isLoggedIn, 
    isAdmin, 
    protectAdminPage, 
    getServerNotifications, 
    createServerNotification, 
    getUserNotifications, 
    createUserNotification, 
    markAllUserNotificationsRead, 
    getAllUsers, 
    deleteUser 
};