# Danh sách node cho dự án quản lý novel

## 1) Core Story (bắt buộc)
- **Project**: Không gian làm việc (dbName, status, tags).
- **Overview**: Tổng quan truyện (title, world overview, genre, era...).
- **Character**: Nhân vật (core identity + schema động).
- **Relationship**: Quan hệ giữa nhân vật (type, note, thời gian...).
- **Event**: Sự kiện (thời gian, mô tả, nhân vật tham gia).
- **Timeline**: Dòng thời gian (era, range, liên kết trước/sau).
- **Arc**: Mạch truyện (arc -> chapter -> scene).
- **Chapter**: Chương.
- **Scene**: Cảnh.
- **Conflict**: Xung đột cốt lõi (nhân vật/nhóm liên quan).

## 2) Worldbuilding (bắt buộc)
- **Location**: Địa điểm (đa cấp, quan hệ cha–con).
- **Faction**: Phe phái/tổ chức.
- **Item**: Vật phẩm.
- **WorldRule**: Luật/thế giới quan.

## 3) Master Data (đề xuất để tránh fix cứng)
- **Race**: Chủng tộc.
- **Rank**: Cấp bậc/tu luyện.
- **SpecialAbility**: Năng lực đặc thù (innate/acquired).

## 4) Hệ thống mở rộng (tùy chọn)
- **Schema (EntitySchema)**: Định nghĩa field động cho từng node.
- **Tag** (nếu muốn chuẩn hóa): Danh mục tag dùng chung.
- **Glossary**: Thuật ngữ trong thế giới (tên riêng, khái niệm).
- **Era/Period**: Thời kỳ lớn (gắn timeline/event).
- **OrganizationRole/Title**: Chức danh, vai trò trong faction.
- **Skill/Technique**: Kỹ năng/công pháp (liên kết Character/Item).

## 5) Gợi ý quan hệ chính (đã/đang dùng)
- Character ↔ Race
- Character ↔ Rank
- Character ↔ SpecialAbility (n-n)
- Character ↔ Faction (role, thời gian)
- Character ↔ Item (sở hữu/sử dụng)
- Event ↔ Character/Location
- Timeline ↔ Event
- Arc ↔ Chapter ↔ Scene
- Scene ↔ Event/Character/Location

## 6) Khuyến nghị phạm vi
- **Giữ cố định nhóm Core + Worldbuilding + Master Data**.
- **Mở rộng bằng Schema** thay vì tạo node mới tùy tiện.
- **Quan hệ nên có metadata** để dễ truy vấn và dựng biểu đồ.
