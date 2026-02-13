# Tổng hợp chức năng BE/FE và khoảng thiếu

## 1) Backend (BE) — Chức năng hiện có

### Kiến trúc & nền tảng
- Node.js + TypeScript + Fastify
- Neo4j (multi-database)
- Swagger UI tại `/docs`
- Flow: routes → controller → service → repo

### Các module/API chính
> Hầu hết module (trừ Project) yêu cầu header `x-neo4j-database`.

- Health
  - `GET /health`

- Project
  - `GET /projects`
  - `POST /projects` (tạo database con theo `dbName`)

- Overview
  - `GET /overview`
  - `POST /overview`
  - `PUT /overview`

- Character
  - `GET /characters` (pagination + filter + search `q`)
  - `POST /characters`
  - `PUT /characters/:id`
  - `DELETE /characters/:id`

- Timeline
  - `GET /timelines` (pagination + filter + search `q`)
  - `POST /timelines`
  - `DELETE /timelines/:id`
  - `POST /timelines/link`
  - `POST /timelines/unlink`
  - `POST /timelines/relink`

- Location
  - `GET /locations` (pagination + filter + search `q`)
  - `POST /locations`
  - `PUT /locations/:id`
  - `DELETE /locations/:id`
  - `POST /locations/contains`
  - `POST /locations/contains/unlink`

- Faction
  - `GET /factions` (pagination + filter + search `q`)
  - `POST /factions`
  - `PUT /factions/:id`
  - `DELETE /factions/:id`

- Event
  - `GET /events` (pagination + filter + search `q`)
  - `POST /events`
  - `PUT /events/:id`
  - `DELETE /events/:id`

- Arc / Chapter / Scene
  - `GET /arcs` (pagination + filter + search `q`)
  - `GET /arcs/structure`
  - `POST /arcs`
  - `PUT /arcs/:id`
  - `DELETE /arcs/:id`
  - `GET /chapters` (pagination + filter + search `q`)
  - `POST /chapters`
  - `PUT /chapters/:id`
  - `DELETE /chapters/:id`
  - `GET /scenes` (pagination + filter + search `q`)
  - `POST /scenes`
  - `PUT /scenes/:id`
  - `DELETE /scenes/:id`
  - `POST /scenes/:id/event`
  - `DELETE /scenes/:id/event`
  - `POST /scenes/:id/location`
  - `DELETE /scenes/:id/location`
  - `POST /scenes/:id/characters`

- Item
  - `GET /items` (pagination + filter + search `q`)
  - `POST /items`
  - `PUT /items/:id`
  - `DELETE /items/:id`
  - `POST /items/:id/event`
  - `DELETE /items/:id/event`
  - `GET /events/:id/items`
  - `GET /items/:id/events`

- Character Relationship
  - `GET /relationship-types?activeOnly=true|false`
  - `POST /relationship-types`
  - `PUT /relationship-types/:id`
  - `DELETE /relationship-types/:id`
  - `GET /character-relations?characterId=...&type=...`
  - `POST /character-relations`
  - `PUT /character-relations`
  - `DELETE /character-relations`

- Conflict checker
  - `GET /conflicts`

- WorldRule
  - `GET /world-rules`
  - `POST /world-rules`
  - `PUT /world-rules/:id`
  - `DELETE /world-rules/:id`

### Trạng thái kỹ thuật BE
- Graph module rỗng (`graph.*` trống)
- Tools seed/check/debug còn placeholder
- Tests trống


## 2) Frontend (FE) — Chức năng hiện có

### Khung ứng dụng
- React + TypeScript + Vite
- Layout: Sidebar + Header + Main
- i18n (EN/VI), lưu ngôn ngữ trong localStorage
- Toast thông báo

### Trang/feature đã có UI
- Overview (Dashboard) — đọc/ghi `overview`
- Character — list, create, edit, delete
- Timeline — list/board, create, delete, link/unlink/relink
- Location — list/tree, create, edit, delete, link/unlink
- Faction — list, create, edit, delete
- Event — list, create, edit, delete + participants + timeline
- Arc — list, create, edit, delete + xem cấu trúc Arc/Chapter/Scene
- Chapter — list, create, edit, delete
- Scene — list, create, edit, delete
- Item — list, create, edit, delete + liên kết event
- Relationship — list, create, edit, delete
- Relationship Type — trang riêng để list, create, edit, delete
  - route FE: `/relationship-types` (T-code `RT01`)
  - Mặc định có seed type gợi ý cho DB mới; sau đó người dùng có thể sửa/xoá/tạo tự do.
- WorldRule — list, create, edit, delete
- Conflict — xem report (read-only)
- Project — chọn project + tạo project (modal)
- HealthCheck đã gắn vào Dashboard

### API FE đang dùng
- `/health`, `/projects`, `/overview`, `/characters`, `/timelines`, `/locations`, `/factions`, `/events`
- `/arcs`, `/arcs/structure`, `/chapters`, `/scenes`
- `/items`, `/items/:id/event`, `/events/:id/items`, `/items/:id/events`
- `/relationship-types`, `/character-relations`, `/world-rules`, `/conflicts`


## 3) FE còn thiếu so với BE

### Thiếu UI
- Graph (nếu định dùng)

### Thiếu endpoint FE (endpoints.ts)
- Không còn thiếu so với BE hiện tại

### Thiếu trang/route FE
- Chưa có route UI cho Graph (nếu cần)

### Khoảng trống về tính năng
- Chưa triển khai filter/pagination/search ở FE (BE đã hỗ trợ)
- Chưa dùng các endpoint liên kết Scene riêng (`/scenes/:id/event`, `/scenes/:id/location`, `/scenes/:id/characters`) — hiện xử lý qua `PUT /scenes/:id`


## 4) Lỗi/thiếu sót đã xử lý
- Đã bổ sung `api.delete` trong `FE/src/services/api.ts`.
- Đã chuẩn hóa header `x-neo4j-database` dùng chung.
- Đã ép kiểu `SKIP/LIMIT` để tránh lỗi Neo4j với số thực.


## 5) Gợi ý next steps (ngắn gọn)
1) Thêm filter/pagination/search ở FE theo query BE (q, limit, offset, tag...).
2) Bổ sung UI/feature cho Graph nếu dùng.
3) Thêm seed data + test tối thiểu.
