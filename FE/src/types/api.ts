export type BaseResponse<T> = {
  data: T;
  message?: string;
};

export type PaginationMeta = {
  limit?: number;
  offset?: number;
  total?: number;
};

export type PagedResponse<T, M = PaginationMeta> = {
  data: T;
  meta?: M;
  message?: string;
};
