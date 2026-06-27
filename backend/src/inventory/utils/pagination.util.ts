export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function buildPaginatedResponse<T>(
  data: T[],
  totalRecords: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalRecords / pageSize);
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
