# Tổng quan Backend Novel

## Công nghệ & kiến trúc
- **Runtime/Ngôn ngữ:** Node.js + TypeScript.
- **Framework HTTP:** Fastify.
- **CSDL:** Neo4j (sử dụng multi-database).
- **Docs:** Swagger + Swagger UI (mặc định mở tại `/docs`).
- **Kiến trúc:** phân lớp `routes -> controller -> service -> repo`.

## Cấu hình môi trường
Các biến môi trường (có default):
- `NEO4J_URI` (mặc định `neo4j://localhost:7687`)
- `NEO4J_USER` (mặc định `neo4j`)
- `NEO4J_PASSWORD` (mặc định `12345678`)
- `NEO4J_DATABASE` (mặc định `novel`)
- `APP_PORT` (mặc định `3000`)
- `NODE_ENV` (`development` | `test` | `production`)

## Cách khởi động
- `npm run dev`: chạy phát triển bằng `ts-node` + `nodemon`.
- `npm run build`: build TypeScript sang `dist/`.
- `npm start`: chạy từ `dist/main.js`.

## Luồng chạy chính
- `src/main.ts`:
  - Kiểm tra kết nối Neo4j khi khởi động.
  - Khởi tạo app Fastify, đăng ký CORS, Swagger, routes.
  - Lắng nghe cổng theo `APP_PORT`.
  - Hỗ trợ shutdown graceful (SIGINT/SIGTERM) + đóng driver Neo4j.

## Cấu trúc dữ liệu chính (Node labels)
- **Project**, **Overview**, **Character**, **Timeline**, **Location**, **Faction**, **Event**.

## Các quan hệ (Relationships)
- `TIMELINE`: `PREVIOUS` / `NEXT` giữa các timeline.
- `LOCATION`: `CONTAINS` giữa vị trí (có metadata `sinceYear`, `untilYear`, `note`).
- `EVENT`: `OCCURS_IN` tới `Location`, `OCCURS_ON` tới `Timeline`.
- `CHARACTER`: `PARTICIPATES_IN` tới `Event` (kèm role, participationType, outcome,...).

## API hiện có
> Lưu ý: hầu hết các module (trừ **Project**) yêu cầu header `x-neo4j-database` để chỉ định DB.

### Health
- `GET /health` → kiểm tra trạng thái API.

### Project (quản lý project & database Neo4j)
- `GET /projects` → lấy danh sách project.
- `POST /projects` → tạo project (tự tạo Neo4j database cùng `dbName`).

### Overview (thông tin tổng quan truyện)
- `GET /overview` → lấy overview.
- `POST /overview` → tạo overview (chỉ cho phép 1 bản ghi).
- `PUT /overview` → cập nhật overview.

### Character
- `GET /characters` → danh sách nhân vật.
- `POST /characters` → tạo nhân vật.
- `PUT /characters/:id` → cập nhật nhân vật.
- `DELETE /characters/:id` → xoá nhân vật.

### Timeline
- `GET /timelines` → danh sách timeline.
- `POST /timelines` → tạo timeline (có thể link `previousId`/`nextId`).
- `DELETE /timelines/:id` → xoá timeline.
- `POST /timelines/link` → link timeline bằng `currentId` + `previousId`/`nextId`.
- `POST /timelines/unlink` → unlink timeline.
- `POST /timelines/relink` → unlink rồi link lại.

### Location
- `GET /locations` → danh sách location.
- `POST /locations` → tạo location.
- `PUT /locations/:id` → cập nhật location.
- `DELETE /locations/:id` → xoá location.
- `POST /locations/contains` → tạo quan hệ `CONTAINS` (có `sinceYear`, `untilYear`, `note`).
- `POST /locations/contains/unlink` → huỷ quan hệ `CONTAINS`.

### Faction
- `GET /factions` → danh sách faction.
- `POST /factions` → tạo faction.
- `PUT /factions/:id` → cập nhật faction.
- `DELETE /factions/:id` → xoá faction.

### Event
- `GET /events` → danh sách event.
- `POST /events` → tạo event (hỗ trợ link Location/Timeline + participants).
- `PUT /events/:id` → cập nhật event (đồng bộ lại quan hệ nếu có).
- `DELETE /events/:id` → xoá event.

## Validation & Error handling
- Validate payload tại `service` layer (type, required, enum, range).
- Trả lỗi dạng `{ message }` với status code rõ ràng (400/404/409/500).
- Dùng `AppError` + `handleError` để chuẩn hoá lỗi.

## Neo4j multi-database
- Module **Project** tạo database mới trong Neo4j (`CREATE DATABASE <dbName>`) rồi lưu Project node.
- Các module còn lại đọc DB từ header `x-neo4j-database` để thao tác dữ liệu.

## Mức độ hoàn thiện / TODO
- Module **Graph** hiện để trống (routes/service/repo chưa triển khai).
- `src/tools/*` (seed/debug/check) chỉ là placeholder.
- `src/tests/*` rỗng (chưa có test thực tế).

## Gợi ý mở rộng nhanh
- Thêm auth (JWT / API key), rate limit.
- Thêm index/constraint cho các node quan trọng (id unique).
- Bổ sung test cho service/repo, và seed dữ liệu mẫu.

