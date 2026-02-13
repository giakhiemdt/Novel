# Node Catalog (Chi tiết theo module hiện tại)

Tài liệu này mô tả chi tiết từng node đang dùng trong dự án hiện tại (BE/FE), bám theo schema TypeScript thật trong `BE/src/modules/*/*.types.ts` và các quan hệ đang khai báo trong `BE/src/shared/constants/relation-types.ts`.

## 1) Bản đồ nhanh

| Node label | Module BE | FE route | Mục đích |
|---|---|---|---|
| `Project` | `project` | chọn ở Sidebar | Quản lý workspace DB |
| `Overview` | `overview` | `/overview` | Tổng quan truyện |
| `Character` | `character` | `/characters` | Nhân vật |
| `Race` | `race` | `/races` | Chủng tộc |
| `RankSystem` | `rank-system` | `/rank-systems` | Hệ thống rank |
| `Rank` | `rank` | `/ranks` | Cấp bậc trong hệ thống |
| `SpecialAbility` | `special-ability` | `/special-abilities` | Năng lực đặc thù |
| `EntitySchema` | `schema` | `/schemas` | Schema động cho entity |
| `Timeline` | `timeline` | `/timelines` | Dòng thời gian |
| `Location` | `location` | `/locations` | Địa điểm, vùng, thế giới |
| `Faction` | `faction` | `/factions` | Phe phái/tổ chức |
| `Event` | `event` | `/events` | Sự kiện |
| `Arc` | `arc` | `/arcs` | Đại mạch truyện |
| `Chapter` | `chapter` | `/chapters` | Chương |
| `Scene` | `scene` | `/scenes` | Cảnh |
| `Item` | `item` | `/items` | Vật phẩm |
| `RelationshipType` | `relationship-type` | `/relationships` | Master data loại quan hệ nhân vật |
| `WorldRule` | `worldrule` | `/world-rules` | Luật thế giới |

## 2) Quan hệ graph chính (hiện đang khai báo)

| Relationship | Ý nghĩa |
|---|---|
| `NEXT` / `PREVIOUS` | Liên kết timeline |
| `RANK_NEXT` | Liên kết rank thăng cấp |
| `HAS_RANK` | RankSystem chứa Rank |
| `CONTAINS` | Location cha-con |
| `ARC_HAS_CHAPTER` | Arc chứa Chapter |
| `CHAPTER_HAS_SCENE` | Chapter chứa Scene |
| `SCENE_REFERENCES_EVENT` | Scene tham chiếu Event |
| `SCENE_FEATURES_CHARACTER` | Scene có Character |
| `SCENE_TAKES_PLACE_IN` | Scene diễn ra ở Location |
| `OWNS_ITEM` | Character/Faction sở hữu Item |
| `ITEM_APPEARS_IN` | Item xuất hiện trong Event |
| `CHARACTER_RELATES_TO` | Quan hệ Character-Character |
| `CHARACTER_HAS_RACE` | Character thuộc Race |
| `CHARACTER_HAS_RANK` | Character có Rank |
| `CHARACTER_HAS_SPECIAL_ABILITY` | Character có SpecialAbility |
| `PARTICIPATES_IN` | Character/Faction tham gia Event |
| `ALLIED_WITH` | Quan hệ đồng minh (mở rộng) |
| `OCCURS_IN` / `OCCURS_ON` | Event diễn ra ở đâu/lúc nào |

## 3) Chi tiết từng node

### 3.1 `Project`
- Vai trò: Quản lý workspace, mapping sang Neo4j database qua `dbName`.
- Required: `name`, `dbName`.
- Optional: `id`, `description`, `status` (`active`|`archived`), `notes`, `tags`.
- Tự sinh/chuẩn hoá: `id`, `createdAt`, `updatedAt`, `status` mặc định `active`.
- API chính: `GET /projects`, `POST /projects`.
- Lưu ý: Đây là node quản trị, không phải node lore.

### 3.2 `Overview`
- Vai trò: Tổng quan cốt lõi của truyện/project.
- Required: `title`.
- Optional: `subtitle`, `genre[]`, `shortSummary`, `worldOverview`, `technologyEra`.
- API chính: `GET /overview`, `POST /overview`, `PUT /overview`.
- Lưu ý: Thường chỉ có 1 bản ghi overview cho 1 database.

### 3.3 `Character`
- Vai trò: Trung tâm narrative (nhân vật).
- Required: `name`, `gender` (`male`|`female`|`other`).
- Optional chính:
- `alias[]`, `level`, `status` (`Alive`|`Dead`), `isMainCharacter`, `age`, `race`, `specialAbilities[]`, `extra`.
- `appearance`, `height`, `distinctiveTraits[]`, `personalityTraits[]`, `beliefs[]`, `fears[]`, `desires[]`, `weaknesses[]`.
- `origin`, `background`, `trauma[]`, `secret`, `currentLocation`, `currentGoal`, `currentAffiliation`, `powerState`, `notes`, `tags[]`.
- Quan hệ thường dùng: `CHARACTER_HAS_RACE`, `CHARACTER_HAS_RANK`, `CHARACTER_HAS_SPECIAL_ABILITY`, `CHARACTER_RELATES_TO`, `PARTICIPATES_IN`, `OWNS_ITEM`, `SCENE_FEATURES_CHARACTER`.
- API chính: `GET/POST/PUT/DELETE /characters`.

### 3.4 `Race`
- Vai trò: Master data về chủng tộc.
- Required: `name`.
- Optional: `alias[]`, `description`, `origin`, `traits[]`, `culture`, `lifespan`, `notes`, `tags[]`.
- Quan hệ thường dùng: `CHARACTER_HAS_RACE`.
- API chính: `GET/POST/PUT/DELETE /races`.

### 3.5 `RankSystem`
- Vai trò: Nhóm/khung cho nhiều `Rank` (không phải 1 rank đơn lẻ).
- Required: `name`.
- Optional: `code`, `description`, `domain`, `priority`, `isPrimary`, `tags[]`.
- Quan hệ: `(:RankSystem)-[:HAS_RANK]->(:Rank)`.
- API chính:
- `GET/POST/PUT/DELETE /rank-systems`
- `GET /rank-systems/:id/ranks` (lấy rank theo system).
- Lưu ý nghiệp vụ:
- `code` là mã ngắn của cả hệ thống, không chứa `rankId`.
- `domain` là nhóm ngữ nghĩa hệ thống (vd: Magic, Body, Soul...).

### 3.6 `Rank`
- Vai trò: Node cấp bậc trong một `RankSystem`.
- Required: `name`.
- Optional: `systemId`, `alias[]`, `tier`, `system` (text), `description`, `notes`, `tags[]`, `color`.
- Quan hệ:
- Thuộc hệ thống qua `HAS_RANK` + `systemId`.
- Tiến cấp qua `RANK_NEXT` (có thể chứa `conditions` và `conditionDescriptions`).
- API chính:
- `GET/POST/PUT/DELETE /ranks`
- `POST /ranks/link`, `POST /ranks/unlink`, `POST /ranks/link/conditions`.
- Lưu ý nghiệp vụ:
- FE hiện đã chặn link rank khác `systemId`.
- `tier` hiện là string, dùng để đặt cột trong matrix sức mạnh.

### 3.7 `SpecialAbility`
- Vai trò: Master data năng lực đặc thù.
- Required: `name`.
- Optional: `type` (`innate`|`acquired`), `description`, `notes`, `tags[]`.
- Quan hệ: `CHARACTER_HAS_SPECIAL_ABILITY`.
- API chính: `GET/POST/PUT/DELETE /special-abilities`.

### 3.8 `EntitySchema`
- Vai trò: Định nghĩa field động cho entity.
- Required: `entity`, `fields[]`.
- Optional: `id`, `title`.
- `fields[]` mỗi field gồm:
- `key`, `label`, `type` (`text`|`number`|`textarea`|`select`|`multiselect`|`boolean`|`date`).
- Optional: `required`, `options[]`, `group`, `order`, `placeholder`, `help`.
- API chính: module `/schemas`.
- Lưu ý: Dùng để mở rộng entity không cần hardcode BE cho field nhỏ.

### 3.9 `Timeline`
- Vai trò: Trục thời gian/chương thời đại.
- Required: `name`, `durationYears`.
- Optional: `code`, `isOngoing`, `summary`, `description`, `characteristics[]`, `dominantForces[]`, `technologyLevel`, `powerEnvironment`, `worldState`, `majorChanges[]`, `notes`, `tags[]`, `previousId`, `nextId`.
- Quan hệ: `NEXT`/`PREVIOUS`, `OCCURS_ON` với Event.
- API chính:
- `GET/POST/DELETE /timelines`
- `POST /timelines/link`, `POST /timelines/unlink`, `POST /timelines/relink`.

### 3.10 `Location`
- Vai trò: Không gian địa lý nhiều cấp.
- Required: `name`.
- Optional nhóm danh tính:
- `alias[]`, `type`, `typeDetail`, `category`, `isHabitable`, `isSecret`, `terrain`, `climate`, `environment`.
- Optional nhóm môi trường/lịch sử:
- `naturalResources[]`, `powerDensity`, `dangerLevel`, `anomalies[]`, `restrictions[]`.
- `historicalSummary`, `legend`, `ruinsOrigin`, `currentStatus`, `controlledBy`, `populationNote`, `notes`, `tags[]`.
- Quan hệ: `CONTAINS` (cha-con), `SCENE_TAKES_PLACE_IN`, `OCCURS_IN`.
- API chính:
- `GET/POST/PUT/DELETE /locations`
- `POST /locations/contains`, `POST /locations/contains/unlink`.

### 3.11 `Faction`
- Vai trò: Tổ chức/phe phái.
- Required: `name`.
- Optional chính:
- `alias[]`, `type`, `alignment`, `isPublic`, `isCanon`.
- `ideology`, `goal`, `doctrine`, `taboos[]`, `powerLevel`, `influenceScope`, `militaryPower`, `specialAssets[]`.
- `leadershipType`, `leaderTitle`, `hierarchyNote`, `memberPolicy`, `foundingStory`, `ageEstimate`.
- `majorConflicts[]`, `reputation`, `currentStatus`, `currentStrategy`, `knownEnemies[]`, `knownAllies[]`, `notes`, `tags[]`.
- Quan hệ: `PARTICIPATES_IN`, `OWNS_ITEM`, liên quan Character/Event/Location.
- API chính: `GET/POST/PUT/DELETE /factions`.

### 3.12 `Event`
- Vai trò: Sự kiện cốt truyện và world state.
- Required: `name`.
- Optional:
- `type`, `typeDetail`, `scope`.
- `locationId`, `location`, `timelineId`, `timelineName`.
- `timelineYear`, `timelineMonth`, `timelineDay`, `durationValue`, `durationUnit`, `startYear`, `endYear`.
- `summary`, `description`, `participants[]`, `notes`, `tags[]`.
- `participants[]` mỗi phần tử: `characterId`, `role`, `participationType`, `outcome`, `statusChange`, `note`, `characterName`.
- Quan hệ: `OCCURS_IN`, `OCCURS_ON`, `PARTICIPATES_IN`, `ITEM_APPEARS_IN`, `SCENE_REFERENCES_EVENT`.
- API chính: `GET/POST/PUT/DELETE /events`.

### 3.13 `Arc`
- Vai trò: Mạch truyện cấp cao.
- Required: `name`.
- Optional: `order`, `summary`, `notes`, `tags[]`.
- Quan hệ: `ARC_HAS_CHAPTER`.
- API chính: `GET/POST/PUT/DELETE /arcs`, `GET /arcs/structure`.

### 3.14 `Chapter`
- Vai trò: Chương con của Arc.
- Required: `name`.
- Optional: `order`, `summary`, `notes`, `tags[]`, `arcId`.
- Quan hệ: `ARC_HAS_CHAPTER`, `CHAPTER_HAS_SCENE`.
- API chính: `GET/POST/PUT/DELETE /chapters`.

### 3.15 `Scene`
- Vai trò: Cảnh cụ thể trong chương.
- Required: `name`.
- Optional: `order`, `summary`, `content`, `notes`, `tags[]`, `chapterId`, `eventId`, `locationId`, `characterIds[]`.
- Quan hệ: `CHAPTER_HAS_SCENE`, `SCENE_REFERENCES_EVENT`, `SCENE_TAKES_PLACE_IN`, `SCENE_FEATURES_CHARACTER`.
- API chính:
- `GET/POST/PUT/DELETE /scenes`
- `POST /scenes/:id/event`, `DELETE /scenes/:id/event`
- `POST /scenes/:id/location`, `DELETE /scenes/:id/location`
- `POST /scenes/:id/characters`.

### 3.16 `Item`
- Vai trò: Vật phẩm có chủ sở hữu, trạng thái.
- Required: `name`.
- Optional: `origin`, `ownerId`, `ownerType` (`character`|`faction`), `status` (`owned`|`lost`|`destroyed`), `powerLevel`, `powerDescription`, `notes`, `tags[]`.
- Quan hệ: `OWNS_ITEM`, `ITEM_APPEARS_IN`.
- API chính:
- `GET/POST/PUT/DELETE /items`
- `POST /items/:id/event`, `DELETE /items/:id/event`
- `GET /events/:id/items`, `GET /items/:id/events`.

### 3.17 `WorldRule`
- Vai trò: Luật cứng/mềm của thế giới.
- Required: `title`.
- Optional: `category`, `description`, `scope`, `constraints`, `exceptions`, `status` (`draft`|`active`|`deprecated`), `version`, `validFrom`, `validTo`, `notes`, `tags[]`.
- API chính: `GET/POST/PUT/DELETE /world-rules`.

### 3.18 `RelationshipType`
- Vai trò: Master data động cho loại quan hệ Character-Character (không fix cứng enum).
- Required: `code`, `name`.
- Optional: `description`, `isDirectional`, `color`, `isActive`.
- Tự sinh/chuẩn hoá: `id`, `createdAt`, `updatedAt`; `code` lưu lower-case.
- API chính: `GET /relationship-types`, `POST`, `PUT /relationship-types/:id`, `DELETE /relationship-types/:id`.
- Lưu ý:
- Có seed mặc định: `family`, `ally`, `enemy`, `romance`, `mentor`, `rival`, `other`.
- Sau khi khởi tạo, tất cả type đều có thể sửa/xoá như custom type.

## 4) Dữ liệu quan hệ quan trọng (không phải node độc lập)

### 4.1 Character Relation (`CHARACTER_RELATES_TO`)
- Type: động theo `RelationshipType.code`.
- Field: `fromId`, `toId`, `type`, `startYear`, `endYear`, `note`, `createdAt`, `updatedAt`.
- API: `GET /character-relations`, `POST`, `PUT`, `DELETE`.

### 4.2 Location Contains (`CONTAINS`)
- Field quan hệ: `sinceYear`, `untilYear`, `note`.
- API: `/locations/contains`, `/locations/contains/unlink`.

### 4.3 Rank Progression (`RANK_NEXT`)
- Field quan hệ: `conditions[]`, `conditionDescriptions[]`.
- API: `/ranks/link`, `/ranks/unlink`, `/ranks/link/conditions`.

## 5) Quy ước dữ liệu khuyến nghị

- `Rank.tier` nên dùng quy ước ổn định để map vào cột matrix sức mạnh:
- Nên dùng dạng có số: `Tier 1`, `Tier 2`, `Tier 3`...
- Nếu dùng tên custom (`Early`, `Core`, `Peak`) thì nên có map nội bộ tương đương số.
- `Rank.systemId` là nguồn sự thật để xác định rank thuộc hệ nào.
- `Rank.system` chỉ là text mô tả, không thay thế `systemId`.
- `RankSystem.code` nên là mã ngắn ổn định (ví dụ `CULTIVATION`, `WIZARD_PATH`).
- `RankSystem.domain` nên chuẩn hoá tập giá trị để lọc tốt hơn.

## 6) Phần đã có UI quản trị đầy đủ

- CRUD + list/detail/filter/pagination:
- `Character`, `Race`, `RankSystem`, `Rank`, `SpecialAbility`, `Timeline`, `Location`, `Faction`, `Event`, `Arc`, `Chapter`, `Scene`, `Item`, `Relationship`, `WorldRule`, `Schema`.
- Riêng `RankSystem` có thêm board tổng quan matrix theo tier chung giữa nhiều hệ.
