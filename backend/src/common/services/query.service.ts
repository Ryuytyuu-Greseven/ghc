import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

export interface QueryOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  [key: string]: any; // Filters
}

export interface QueryConfig {
  searchFields?: string[];
  exactFilters?: string[];
  regexFilters?: string[];
  dateFilters?: { [field: string]: { fromParam?: string; toParam?: string } };
  objectIdFilters?: string[];
  sortMapping?: { [paramName: string]: string };
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  /**
   * When true, the search term is matched using fuzzy regex:
   * the original term + all single-character deletion variants are
   * combined with $or so that a 1-character typo or DB spelling
   * difference still resolves correctly (e.g. "paracetamol" matches
   * "Paracetmol" stored in the DB).
   */
  fuzzySearch?: boolean;
}

@Injectable()
export class QueryService {
  buildQuery(options: QueryOptions, config: QueryConfig) {
    const filter: any = {};
    const sort: any = {};

    // 1. Search (OR group over multiple fields)
    const searchVal = options.search || options.q;
    if (searchVal && config.searchFields && config.searchFields.length > 0) {
      console.log('searchVal', searchVal);
      if (config.fuzzySearch) {
        // Build fuzzy patterns: original term + all single-char deletions.
        // This tolerates a 1-character difference between the query and the
        // stored value (typo, abbreviation, or DB spelling variation).
        const term = searchVal as string;
        const variants = new Set<string>();
        variants.add(term); // exact
        for (let i = 0; i < term.length; i++) {
          variants.add(term.slice(0, i) + term.slice(i + 1)); // delete char at i
        }
        const patterns = [...variants].map((v) => new RegExp(v, 'i'));
        filter.$or = patterns.flatMap((re) =>
          config.searchFields!.map((field) => ({ [field]: { $regex: re } })),
        );
      } else {
        filter.$or = config.searchFields.map((field) => ({
          [field]: { $regex: searchVal, $options: 'i' },
        }));
      }
    }

    // 2. Exact Match Filters
    if (config.exactFilters) {
      for (const field of config.exactFilters) {
        if (
          options[field] !== undefined &&
          options[field] !== '' &&
          options[field] !== 'All'
        ) {
          // Cast string booleans
          if (options[field] === 'true' || options[field] === true) {
            filter[field] = true;
          } else if (options[field] === 'false' || options[field] === false) {
            filter[field] = false;
          } else {
            filter[field] = options[field];
          }
        }
      }
    }

    // 3. Regex Match Filters
    if (config.regexFilters) {
      for (const field of config.regexFilters) {
        if (options[field] !== undefined && options[field] !== '') {
          filter[field] = { $regex: options[field], $options: 'i' };
        }
      }
    }

    // 4. ObjectId Filters
    if (config.objectIdFilters) {
      for (const field of config.objectIdFilters) {
        if (
          options[field] !== undefined &&
          options[field] !== '' &&
          options[field] !== 'All'
        ) {
          try {
            filter[field] = new Types.ObjectId(options[field]);
          } catch {
            // If not a valid ObjectId, use as is (or ignore)
            filter[field] = options[field];
          }
        }
      }
    }

    // 5. Date Range Filters
    if (config.dateFilters) {
      for (const [dbField, rangeConfig] of Object.entries(config.dateFilters)) {
        const fromVal = rangeConfig.fromParam
          ? options[rangeConfig.fromParam]
          : undefined;
        const toVal = rangeConfig.toParam
          ? options[rangeConfig.toParam]
          : undefined;

        if (fromVal || toVal) {
          filter[dbField] = {};
          if (fromVal) filter[dbField].$gte = new Date(fromVal);
          if (toVal) filter[dbField].$lte = new Date(toVal);
        }
      }
    }

    // 6. Sorting
    const defaultSortField = config.defaultSort?.field ?? 'createdAt';
    const defaultSortOrder = config.defaultSort?.order ?? 'desc';

    const sortBy = options.sortBy ?? defaultSortField;
    const sortOrder = options.sortOrder ?? defaultSortOrder;
    const sortVal = sortOrder === 'desc' ? -1 : 1;

    const mappedSortField = config.sortMapping?.[sortBy] ?? sortBy;
    sort[mappedSortField] = sortVal;

    // 7. Pagination
    const page = Math.max(1, Number(options.page ?? 1));
    const pageSize = Math.max(1, Number(options.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    return {
      filter,
      sort,
      skip,
      limit: pageSize,
      page,
      pageSize,
    };
  }
}
