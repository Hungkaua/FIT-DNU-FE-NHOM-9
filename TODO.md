# TODO - Admin xóa + cảnh báo + xử lý comment

## Thông tin đã thu thập

- Trang admin đã có UI duyệt/từ chối bài viết trong `admin.html` và logic trong `js/admin.js`.
- Phần “bình luận trong bài bị lỗi/đổi qua bài khác” có khả năng do rendering comments hiện tại dựa trên endpoint `getCommentsByPost(postId)` và mỗi comment phải có `postId` đúng.
- Hiện chưa xác định chính xác bug comment theo mô tả (không có console error được cung cấp).

## Kế hoạch chỉnh sửa (đề xuất)

1. [Admin] Bổ sung nút **Xóa bài viết** ở trang admin (tab duyệt bài viết).
2. [Admin] Khi admin xóa: hiển thị confirm + cảnh báo.
3. [Admin] Khi xóa/bị từ chối: gửi thông báo cho người đăng bài (đã có hàm `createUserNotification`).
4. [Comment] Xác định nguyên nhân “comment chuyển sang post khác”: đảm bảo `createComment` lưu kèm `postId`, và `getCommentsByPost(postId)` lọc đúng theo `postId`.
5. Nếu còn lỗi: thêm cơ chế cache theo `postId` và chỉ render comment đúng panel.

## Trạng thái

- Chưa bắt đầu chỉnh sửa code.
