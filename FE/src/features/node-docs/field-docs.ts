const fieldDescriptions: Record<string, string> = {
  id: "Định danh duy nhất của bản ghi trong hệ thống.",
  name: "Tên hiển thị chính của node.",
  title: "Tiêu đề chính của nội dung.",
  subtitle: "Tiêu đề phụ để làm rõ ngữ cảnh.",
  code: "Mã ngắn để tra cứu, lọc và liên kết dữ liệu.",
  description: "Mô tả chi tiết ý nghĩa và phạm vi của node.",
  summary: "Tóm tắt ngắn gọn nội dung chính.",
  shortSummary: "Tóm tắt ngắn dùng cho màn hình tổng quan.",
  notes: "Ghi chú bổ sung không bắt buộc.",
  tags: "Tập nhãn để phân loại và tìm kiếm nhanh.",
  alias: "Các tên gọi khác của cùng một thực thể.",
  status: "Trạng thái hiện tại của bản ghi.",
  createdAt: "Thời điểm tạo bản ghi.",
  updatedAt: "Thời điểm cập nhật gần nhất.",
  dbName: "Tên database Neo4j mà project sử dụng.",
  genre: "Nhóm thể loại của truyện/dữ liệu.",
  module: "Nhóm chức năng quản lý node.",
  route: "Đường dẫn FE để mở màn hình quản lý.",
  tCode: "Mã lệnh nhanh trong command bar.",
  gender: "Giới tính nhân vật.",
  importance: "Mức độ quan trọng của nhân vật trong cốt truyện.",
  age: "Tuổi của nhân vật.",
  level: "Cấp độ hiện tại của nhân vật.",
  race: "Tên chủng tộc hiển thị trực tiếp.",
  raceId: "ID chủng tộc tham chiếu từ node Race.",
  rankId: "ID rank tham chiếu từ node Rank.",
  systemId: "ID hệ thống cha để nhóm và truy vấn dữ liệu.",
  system: "Tên hệ thống dạng text để hiển thị/phân loại.",
  tier: "Tầng/cấp dùng để phân lớp tiến trình sức mạnh.",
  color: "Màu hiển thị trên board/graph.",
  isPrimary: "Đánh dấu hệ thống chính.",
  isActive: "Bật/tắt khả dụng trong danh sách chọn.",
  isDirectional: "Quan hệ có hướng một chiều hay không.",
  isMainCharacter: "Đánh dấu nhân vật chính (legacy).",
  previousId: "ID node đứng trước trong chuỗi tiến trình.",
  nextId: "ID node đứng sau trong chuỗi tiến trình.",
  durationYears: "Độ dài theo năm của timeline/giai đoạn.",
  startYear: "Năm bắt đầu của sự kiện/quan hệ.",
  endYear: "Năm kết thúc của sự kiện/quan hệ.",
  timelineId: "ID timeline tham chiếu.",
  timelineYear: "Mốc năm tương đối trong timeline.",
  timelineMonth: "Mốc tháng tương đối trong timeline.",
  timelineDay: "Mốc ngày tương đối trong timeline.",
  locationId: "ID địa điểm tham chiếu.",
  chapterId: "ID chapter cha của scene.",
  arcId: "ID arc cha của chapter.",
  eventId: "ID sự kiện tham chiếu.",
  ownerId: "ID chủ sở hữu hiện tại.",
  ownerType: "Loại chủ sở hữu (character/faction).",
  type: "Loại dữ liệu/quan hệ để xử lý nghiệp vụ.",
  typeDetail: "Mô tả chi tiết hơn cho trường type.",
  scope: "Phạm vi ảnh hưởng hoặc áp dụng.",
  entity: "Tên entity mà schema động áp dụng.",
  fields: "Danh sách field cấu hình cho schema động.",
  config: "Cấu hình JSON mở rộng cho thuật toán/chức năng.",
  seed: "Giá trị seed để tái tạo dữ liệu ngẫu nhiên ổn định.",
  width: "Chiều rộng không gian làm việc hoặc bản đồ.",
  height: "Chiều cao không gian làm việc hoặc bản đồ.",
  fromId: "ID node nguồn trong một quan hệ.",
  toId: "ID node đích trong một quan hệ.",
  note: "Ghi chú cho bản ghi hoặc quan hệ cụ thể.",
  constraints: "Các ràng buộc bắt buộc phải tuân theo.",
  exceptions: "Các ngoại lệ cho phép vượt quy tắc.",
  validFrom: "Mốc thời gian rule bắt đầu có hiệu lực.",
  validTo: "Mốc thời gian rule hết hiệu lực.",
  version: "Phiên bản của rule hoặc tài liệu.",
};

const normalizeField = (field: string) =>
  field.replace(/\[\]$/g, "").replace(/\?$/g, "").trim();

export const describeField = (field: string): string => {
  const normalized = normalizeField(field);
  const direct = fieldDescriptions[normalized];
  if (direct) {
    if (field.endsWith("[]")) {
      return `Danh sách: ${direct.charAt(0).toLowerCase()}${direct.slice(1)}`;
    }
    return direct;
  }

  if (field.endsWith("[]")) {
    return "Danh sách giá trị cùng loại phục vụ mô tả/quan hệ mở rộng.";
  }

  if (normalized.endsWith("Id")) {
    return "Định danh tham chiếu đến node liên quan.";
  }

  if (normalized.startsWith("is")) {
    return "Cờ boolean dùng để bật/tắt hoặc đánh dấu trạng thái.";
  }

  if (normalized.endsWith("At")) {
    return "Mốc thời gian hệ thống ghi nhận cho bản ghi.";
  }

  return "Trường nghiệp vụ mở rộng của node.";
};
