# GRAPH-V1 — WORLD LORE GRAPH SCHEMA

Phiên bản: v1  
Mục đích: Lưu trữ – truy xuất – kiểm tra lore tiểu thuyết bằng Neo4j  
Nguyên tắc:
- Graph-first (node + relationship)
- Không dư thừa
- Phục vụ sáng tác, không phục vụ trình diễn

---

## I. NODE DEFINITIONS

### 1. Character
Đại diện cho cá nhân có ý thức, hành động và ảnh hưởng đến thế giới.

Thuộc tính gợi ý:
- id
- name
- alias
- description
- status (alive / dead / unknown)
- importance (1–10)

---

### 2. Event
Một sự kiện xảy ra trong dòng thời gian, có thể ảnh hưởng đến nhiều thực thể.

Thuộc tính gợi ý:
- id
- name
- description
- type (battle, ritual, meeting, disaster, discovery...)
- significance (1–10)

---

### 3. Timeline
Mốc hoặc giai đoạn thời gian dùng để sắp xếp sự kiện.

Thuộc tính gợi ý:
- id
- name
- order (số thứ tự)
- description

---

### 4. Item
Vật phẩm, cổ vật, công cụ có thể được sử dụng hoặc sở hữu.

Thuộc tính gợi ý:
- id
- name
- type (weapon, relic, artifact, tool...)
- rarity
- description

---

### 5. SoulArt
Thuật hồn / năng lực siêu phàm gắn với cá nhân.

Thuộc tính gợi ý:
- id
- name
- category
- description
- danger_level (1–10)

---

### 6. Faction
Thế lực, tổ chức, giáo phái, quốc gia.

Thuộc tính gợi ý:
- id
- name
- ideology
- description
- power_level (1–10)

---

### 7. Location
Địa điểm nơi sự kiện xảy ra hoặc thế lực đóng trú.

Thuộc tính gợi ý:
- id
- name
- type (city, ruin, academy, battlefield...)
- description

---

## II. RELATIONSHIP DEFINITIONS

### Character-centered Relationships

- (Character)-[:USES]->(SoulArt)  
  Nhân vật sử dụng thuật hồn.

- (Character)-[:BOUND_TO]->(Item)  
  Vật phẩm bị ràng buộc với nhân vật.

- (Character)-[:BELONGS_TO]->(Faction)  
  Nhân vật thuộc về thế lực.

- (Character)-[:PARTICIPATED_IN]->(Event)  
  Nhân vật tham gia sự kiện.

- (Character)-[:HATES]->(Character)  
- (Character)-[:LOVES]->(Character)  
- (Character)-[:FEARS]->(Character)  
  Quan hệ cảm xúc giữa các nhân vật.

---

### Item Relationships

- (Item)-[:CREATED_BY]->(Character)  
- (Item)-[:CREATED_BY]->(Faction)  
  Nguồn gốc tạo ra vật phẩm.

---

### Event Relationships

- (Event)-[:HAPPENED_IN]->(Location)  
  Địa điểm sự kiện xảy ra.

- (Event)-[:AT_TIME]->(Timeline)  
  Mốc thời gian của sự kiện.

- (Event)-[:BEFORE]->(Event)  
- (Event)-[:AFTER]->(Event)  
  Quan hệ nhân quả / thứ tự giữa các sự kiện.

---

### Timeline Relationships

- (Timeline)-[:NEXT]->(Timeline)  
  Dòng chảy tuyến tính của thời gian.

---

### Faction Relationships

- (Faction)-[:PARTICIPATED_IN]->(Event)  
  Thế lực tham gia hoặc gây ra sự kiện.

- (Faction)-[:LOCATED_AT]->(Location)  
  Căn cứ hoặc khu vực hoạt động chính.

---

## III. DESIGN NOTES

- Relationship có thể mở rộng property sau (impact, role, intensity…)
- Không bắt buộc schema cứng, nhưng phải tuân thủ tên node và relationship
- Graph này là core, mọi mở rộng sau phải tương thích v1

---

## IV. NON-GOALS (v1 không làm)

- Không mô hình hóa bản đồ không gian chi tiết
- Không mô hình hóa tiến hóa SoulArt
- Không tối ưu cho visualization nâng cao
- Không tích hợp AI ở v1

---

## V. VERSIONING

- v1: Core lore graph (hiện tại)
- v2 (dự kiến): Property-rich relationships + lore validation
- v3 (dự kiến): AI query & contradiction detection
