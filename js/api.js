// URL API cố định - ĐÚNG VỚI CẤU TRÚC CỦA BẠN
// POST_API_URL: cho bài viết
// LOGIN_API_URL: cho chức năng đăng nhập/đăng ký người dùng
const api_url = {
    POST_API_URL: "https://69fd353c30ad0a6fd1c09463.mockapi.io/apis/Post",
    COMMENT_API_URL: "https://69fd353c30ad0a6fd1c09463.mockapi.io/apis/Comment",
    LOGIN_API_URL: "https://6a05f22eaa826ca75c0ae2f4.mockapi.io/apis/login",
};

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

async function createPost(data) {
    return await postData(api_url.POST_API_URL, data);
}

async function deletePost(id) {
    return await deleteData(api_url.POST_API_URL, id);
}

// ========== COMMENT FUNCTIONS ==========
async function getAllComments() {
    try {
        const comments = await get(api_url.COMMENT_API_URL);
        return Array.isArray(comments) ? comments : [];
    } catch (error) {
        console.error("Lỗi lấy bình luận:", error);
        return [];
    }
}

async function createComment(data) {
    return await postData(api_url.COMMENT_API_URL, data);
}

async function getCommentsByPost(postId) {
    try {
        const comments = await get(`${api_url.COMMENT_API_URL}?postId=${encodeURIComponent(postId)}`);
        return Array.isArray(comments) ? comments : [];
    } catch (error) {
        console.error("Lỗi lấy bình luận theo bài viết:", error);
        return [];
    }
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
export { getAllPosts, createPost, deletePost, getAllComments, getCommentsByPost, createComment, login, register, logout, getCurrentUser, isLoggedIn, isAdmin, protectAdminPage };