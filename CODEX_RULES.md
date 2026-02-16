# CODEX_RULES.md

## 1) Mục tiêu
Tài liệu này định nghĩa chuẩn làm việc cho Codex trong dự án `Novel` để đảm bảo:
- Đồng nhất UI/UX giữa các trang.
- Không phá vỡ chức năng đang có.
- Quy trình thay đổi rõ ràng, có kiểm chứng và commit chuẩn.

## 2) Nguyên tắc bắt buộc
- Không tự ý đổi hành vi nghiệp vụ nếu chưa được yêu cầu.
- Ưu tiên tái sử dụng component chung, tránh copy code lặp lại.
- Mọi thay đổi phải theo batch nhỏ, dễ review, dễ rollback.
- Mỗi lần thay đổi code phải commit 1 message ngắn gọn, rõ nghĩa.

## 3) Chuẩn cấu trúc FE (CRUD pages)
Áp dụng cho các trang `*Create.tsx` trong `FE/src/features`:

1. Phần đầu trang phải dùng `CrudPageShell`.
2. `CrudPageShell` chuẩn gồm:
- `title`, `subtitle`
- `showForm`
- `createLabel`
- `onToggleForm`
- `controls` (filter, list toggle, board toggle nếu có)
- `list` (list + pagination)
3. Form tạo/sửa đặt bên dưới shell, không nhét trực tiếp lẫn trong list block.
4. Trạng thái mặc định:
- `showForm = false`
- `showList = false` (trừ khi có yêu cầu khác)
- Các board nặng (graph/map/timeline/rank board) mặc định đóng.
5. Các trang có board vẫn giữ chức năng riêng (drag, zoom, minimap, link editor...), chỉ chuẩn hóa phần CRUD/filter/list.

## 4) Chuẩn UI/UX
- Giữ cùng hệ class/style hiện có, không tự ý thay theme tổng thể.
- Nút và hành vi phải nhất quán giữa các trang: Create/Close form, List toggle, Filter actions.
- Các lựa chọn hiển thị phải theo i18n hiện hành (hiển thị theo ngôn ngữ, dữ liệu lưu theo giá trị chuẩn backend).

## 5) Chuẩn API và dữ liệu
- Không thay đổi contract API nếu chưa có yêu cầu rõ ràng.
- Khi thêm field mới: cập nhật đồng bộ types, schema validate, UI form, list hiển thị (nếu cần), docs liên quan.
- Với thao tác delete/link/unlink: luôn xử lý confirm/error message rõ ràng.

## 6) Quy trình thực hiện chuẩn
Cho mỗi yêu cầu:
1. Quét phạm vi ảnh hưởng (file/component/API liên quan).
2. Đề xuất cách làm ngắn gọn và bắt đầu triển khai ngay.
3. Sửa theo batch nhỏ (ưu tiên 2-5 file/batch nếu thay đổi lớn).
4. Chạy verify tối thiểu:
- `cd FE && npm run build` cho thay đổi frontend.
- `cd BE && npm run build` (hoặc test phù hợp) cho thay đổi backend.
5. Commit theo chuẩn.
6. Báo cáo kết quả + các giới hạn còn lại (nếu có).

## 7) Quy tắc commit
- Dùng Conventional Commit ngắn gọn:
- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `docs: ...`
- `chore: ...`
- Message tiếng Anh, 1 dòng, dễ hiểu.

Ví dụ:
- `feat: standardize CRUD shell for character pages`
- `fix: prevent outer scroll while zooming board`
- `docs: update node field definitions`

## 8) An toàn khi thao tác git
- Không dùng lệnh phá huỷ (`git reset --hard`, `git checkout --`) nếu chưa được yêu cầu.
- Không tự ý revert phần user đang làm dở.
- Nếu phát hiện thay đổi bất ngờ ngoài phạm vi đang sửa: dừng và hỏi lại user.

## 9) Checklist trước khi kết thúc task
- [ ] Build pass.
- [ ] Không có lỗi TypeScript mới.
- [ ] Không làm mất chức năng cũ của trang.
- [ ] UI giữ tính đồng nhất với chuẩn hiện tại.
- [ ] Đã commit đúng chuẩn message.
- [ ] Báo rõ các thay đổi chính.

## 10) Câu lệnh gợi ý để user gọi Codex
User có thể dùng câu này trong phiên mới:

`Hãy đọc CODEX_RULES.md và tuân thủ nghiêm ngặt toàn bộ quy tắc trước khi làm.`
