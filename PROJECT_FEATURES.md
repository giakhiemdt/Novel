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
  - `GET /character-relations?characterId=...&type=...`
  - `POST /character-relations`
  - `PUT /character-relations`
  - `DELETE /character-relations`

- Conflict checker
  - `GET /conflicts`

- WorldRule
  - routes đã đăng ký (có module), chưa có UI FE

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
- Project — chọn project + tạo project (modal)
- HealthCheck component có sẵn (chưa gắn vào UI chính)

### API FE đang dùng
- `/health`, `/projects`, `/overview`, `/characters`, `/timelines`, `/locations`, `/factions`, `/events`


## 3) FE còn thiếu so với BE

### Thiếu UI hoàn toàn
- Arc / Chapter / Scene
- Item
- Character Relationship
- WorldRule
- Conflict checker
- Graph (nếu định dùng)

### Thiếu endpoint FE (endpoints.ts)
- `arcs`, `chapters`, `scenes`
- `items`, `events/:id/items`, `items/:id/events`
- `character-relations`
- `conflicts`
- `worldrules` (tên route theo BE)

### Thiếu trang/route FE
- Chưa có route UI cho các module trên trong `FE/src/app/router.tsx`


## 4) Lỗi/thiếu sót đã xử lý
- Đã bổ sung `api.delete` trong `FE/src/services/api.ts`.


## 5) Gợi ý next steps (ngắn gọn)
1) Bổ sung endpoints + api clients cho các module thiếu.
2) Dựng UI tối thiểu cho Arc/Chapter/Scene và Item.
3) Thêm trang Conflict checker (read-only) và Relationship.
4) Nối HealthCheck vào Dashboard.
