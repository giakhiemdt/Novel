# Tổng quan Backend Novel

## Mục tiêu dự án
Backend quản lý dữ liệu tiểu thuyết dài hạn (worldbuilding + cấu trúc kể chuyện), sử dụng Neo4j để lưu node và quan hệ.

## Công nghệ & kiến trúc
- **Runtime/Ngôn ngữ:** Node.js + TypeScript.
- **Framework HTTP:** Fastify.
- **CSDL:** Neo4j (multi-database).
- **Docs:** Swagger + Swagger UI (`/docs`).
- **Kiến trúc:** `routes → controller → service → repo`.

## Cấu hình môi trường
- `NEO4J_URI` (mặc định `neo4j://localhost:7687`)
- `NEO4J_USER` (mặc định `neo4j`)
- `NEO4J_PASSWORD` (mặc định `12345678`)
- `NEO4J_DATABASE` (mặc định `novel`)
- `APP_PORT` (mặc định `3000`)
- `NODE_ENV` (`development` | `test` | `production`)
- `TIMELINE_READ_MODE` (`legacy` | `timeline`, mặc định `legacy`)
- `TIMELINE_WRITE_MODE` (`legacy` | `dual-write` | `timeline`, mặc định `legacy`)
- `TIMELINE_AUDIT_ENABLED` (`true` | `false`, mặc định `true`)

## Cách khởi động
- `npm run dev`: chạy phát triển bằng `ts-node` + `nodemon`.
- `npm run build`: build TypeScript sang `dist/`.
- `npm start`: chạy từ `dist/main.js`.

## Luồng chạy chính
- Kiểm tra kết nối Neo4j khi start.
- Tự động tạo constraint + full-text index nếu chưa có.
- Khởi tạo Fastify + đăng ký routes + swagger.

## Model dữ liệu chính (Node)
- **Project**: dự án tiểu thuyết (tạo DB con).
- **Overview**: tổng quan thế giới.
- **Character**: nhân vật.
- **Timeline**: dòng thời gian.
- **TimelineAxis / TimelineEra / TimelineSegment / TimelineMarker / TimelineStateChange**: lớp nền cho timeline-first (phase migration).
- **Location**: địa điểm.
- **Faction**: phe phái.
- **Event**: sự kiện.
- **Arc / Chapter / Scene**: cấu trúc kể chuyện.
- **Item**: vật phẩm.
- **CharacterRelation**: quan hệ nhân vật ↔ nhân vật.

## Quan hệ (Relationships)
- **Timeline**: `PREVIOUS` / `NEXT` giữa các timeline.
- **Timeline-first foundation**: `HAS_ERA`, `HAS_SEGMENT`, `HAS_MARKER`, `HAS_EVENT`, `CAUSES_CHANGE`, `APPLIES_TO`, `BRANCHES_FROM`, `RETURNS_TO`, `PARALLEL_WITH`.
- **Location**: `CONTAINS` giữa vị trí (có `sinceYear`, `untilYear`, `note`).
- **Event**: `OCCURS_IN` (Location), `OCCURS_ON` (Timeline), `PARTICIPATES_IN` (Character).
- **Arc/Chapter/Scene**: `ARC_HAS_CHAPTER`, `CHAPTER_HAS_SCENE`.
- **Scene**: `SCENE_REFERENCES_EVENT`, `SCENE_FEATURES_CHARACTER`, `SCENE_TAKES_PLACE_IN`.
- **Item**: `OWNS_ITEM` (Character/Faction), `ITEM_APPEARS_IN` (Event).
- **CharacterRelation**: `CHARACTER_RELATES_TO` (relation type + thời gian hiệu lực).

## API hiện có
> Lưu ý: hầu hết các module (trừ **Project**) yêu cầu header `x-neo4j-database`.

### Health
- `GET /health`

### Project
- `GET /projects`
- `POST /projects` (tự tạo Neo4j database theo `dbName`)

### Overview
- `GET /overview`
- `POST /overview`
- `PUT /overview`

### Character
- `GET /characters` (pagination + filter + search `q`)
- `POST /characters`
- `PUT /characters/:id`
- `DELETE /characters/:id`

### Timeline
- `GET /timelines` (pagination + filter + search `q`)
- `POST /timelines`
- `PUT /timelines/:id`
- `DELETE /timelines/:id`
- `POST /timelines/link`
- `POST /timelines/unlink`
- `POST /timelines/relink`

### Timeline Structure (Timeline-first)
- `GET /timeline-axes` (pagination + filter + search `q`)
- `POST /timeline-axes`
- `PUT /timeline-axes/:id`
- `DELETE /timeline-axes/:id`

- `GET /timeline-eras` (pagination + filter + search `q`)
- `POST /timeline-eras`
- `PUT /timeline-eras/:id`
- `DELETE /timeline-eras/:id`

- `GET /timeline-segments` (pagination + filter + search `q`)
- `POST /timeline-segments`
- `PUT /timeline-segments/:id`
- `DELETE /timeline-segments/:id`

- `GET /timeline-markers` (pagination + filter + search `q`)
- `POST /timeline-markers`
- `PUT /timeline-markers/:id`
- `DELETE /timeline-markers/:id`

### Timeline State Change (Timeline-first)
- `GET /timeline-state-changes` (pagination + filter + search `q`)
- `POST /timeline-state-changes`
- `PUT /timeline-state-changes/:id`
- `DELETE /timeline-state-changes/:id`
- `GET /timeline-state-changes/snapshot` (query `axisId` + `tick`)
- `GET /timeline-state-changes/projection` (project trạng thái thực thể tại `axisId` + `tick`)
- `GET /timeline-state-changes/diff` (so sánh 2 mốc `fromTick` và `toTick` cho một thực thể)
- `GET /timeline-state-changes/history` (replay lịch sử thay đổi cho `axisId` + `subjectType` + `subjectId`)

### Location
- `GET /locations` (pagination + filter + search `q`)
- `POST /locations`
- `PUT /locations/:id`
- `DELETE /locations/:id`
- `POST /locations/contains`
- `POST /locations/contains/unlink`

### Faction
- `GET /factions` (pagination + filter + search `q`)
- `POST /factions`
- `PUT /factions/:id`
- `DELETE /factions/:id`

### Event
- `GET /events` (pagination + filter + search `q`)
- `POST /events`
- `PUT /events/:id`
- `DELETE /events/:id`

### Arc / Chapter / Scene
- `GET /arcs` (pagination + filter + search `q`)
- `GET /arcs/structure` (Arc → Chapter → Scene)
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

### Scene liên kết riêng
- `POST /scenes/:id/event`
- `DELETE /scenes/:id/event`
- `POST /scenes/:id/location`
- `DELETE /scenes/:id/location`
- `POST /scenes/:id/characters`

### Item (Artifact)
- `GET /items` (pagination + filter + search `q`)
- `POST /items`
- `PUT /items/:id`
- `DELETE /items/:id`
- `POST /items/:id/event`
- `DELETE /items/:id/event`
- `GET /events/:id/items` (pagination + filter + search `q`)
- `GET /items/:id/events` (pagination + filter + search `q`)

### Character Relationship
- `GET /character-relations?characterId=...&type=...`
- `POST /character-relations`
- `PUT /character-relations`
- `DELETE /character-relations`

### Conflict Checker
- `GET /conflicts`
  - Event overlap theo timeline
  - Scene không thuộc Chapter
  - Chapter không thuộc Arc
  - Character status = Dead nhưng vẫn xuất hiện ở Event

## Validation & Error handling
- Validate payload tại service (required, enum, range, format).
- Trả lỗi `{ message }` với status code 400/404/409/500.
- Dùng `AppError` + `handleError`.

## Timeline Dual-write
- Khi `TIMELINE_WRITE_MODE=dual-write`, các API create/update của `Character`, `Item`, `Location`, `Event` sẽ tự ghi `TimelineStateChange` theo dạng best-effort.
- Header cần có để ghi state change:
  - `x-timeline-axis-id`
  - `x-timeline-tick`
- Header tùy chọn: `x-timeline-era-id`, `x-timeline-segment-id`, `x-timeline-marker-id`, `x-timeline-event-id`.
- Nếu thiếu header timeline, API chính vẫn thành công và dual-write sẽ bị bỏ qua.

## Tìm kiếm & phân trang
- Hầu hết list API hỗ trợ `limit`, `offset`, filter, và full‑text `q`.
- Full‑text index: Character, Event, Location, Faction, Timeline, TimelineAxis, TimelineEra, TimelineSegment, TimelineMarker, TimelineStateChange, Arc, Chapter, Scene, Item, Project, Overview.

## Multi‑database Neo4j
- `POST /projects` tạo DB mới.
- Các module còn lại thao tác DB theo `x-neo4j-database`.

## Mức độ hoàn thiện / TODO
- `Graph` module còn trống.
- `tools/*` (seed/debug/check) còn placeholder.
- `tests/*` chưa có test thực tế.
