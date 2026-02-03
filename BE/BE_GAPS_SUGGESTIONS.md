# Roadmap ưu tiên (theo mức độ quan trọng/khẩn cấp)

## P0 — Nền tảng tối thiểu để vận hành dài hạn (cần làm sớm)
- **Data integrity**: unique constraint (id, name theo loại), validate quan hệ (event–timeline–location).
- **Pagination + filter**: tránh tải toàn bộ dữ liệu; filter theo tag, timeline, location, faction.
- **Full‑text search**: tìm nhanh theo tên + mô tả dài.
- **Versioning/History**: lưu lịch sử chỉnh sửa (ai, khi nào, thay đổi gì) để tránh mất lore.
- **Soft delete**: tránh xoá vĩnh viễn dữ liệu quan trọng.

## P1 — Mở rộng mô hình để bao quát tiểu thuyết dài hạn
- **Arc/Chapter/Volume**: chia cấu trúc truyện, map scene → event.
- **Quan hệ nhân vật**: gia đình, đồng minh, kẻ thù, thầy‑trò (kèm thời gian).
- **Quan hệ phe phái**: liên minh/thù địch, thay đổi theo timeline.
- **Item/Artifact**: nguồn gốc, chủ sở hữu, trạng thái.
- **Hệ thống sức mạnh/Skill**: mô tả, cấp bậc, điều kiện.

## P2 — Nâng cấp quản lý dữ liệu lớn
- **Bulk import/export**: CSV/JSON.
- **Tagging chuẩn hoá**: taxonomy tag để tránh trùng lặp khái niệm.
- **Alias/canonical name**: nhiều tên gọi cho cùng thực thể.
- **Batch operations**: tạo/cập nhật nhiều item.

## P3 — Truy vấn nâng cao & báo cáo
- **Graph queries**: truy vấn quan hệ phức tạp (network).
- **Dashboard thống kê**: số event theo arc, nhân vật xuất hiện nhiều nhất.
- **Phát hiện xung đột timeline**: trùng thời gian, sai thứ tự.

## P4 — Quy trình cộng tác & vận hành
- **User/Role/Permission**: owner/editor/viewer.
- **Draft/Publish + Review**: quy trình duyệt nội dung.
- **Backup/Restore**: snapshot định kỳ.

## P5 — Kiểm thử & chất lượng
- **Unit tests** cho service/repo.
- **Integration tests** cho Neo4j.
- **Mock data generator** để test dữ liệu lớn.

