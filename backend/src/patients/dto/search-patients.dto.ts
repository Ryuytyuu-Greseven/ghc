export class SearchPatientsDto {
  page?: number;
  pageSize?: number;
  search?: string;
  hospitalId?: string;
  bedRequired?: boolean | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
