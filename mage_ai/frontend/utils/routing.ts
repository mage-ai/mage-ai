import Router from 'next/router';

import { MetaQueryEnum } from '@api/constants';
import {
  queryFromUrl,
  queryString,
} from '@utils/url';
import { remove } from '@utils/array';

type GoToWithQueryProps = {
  preserveParams?: string[];
  pushHistory?: boolean;
  replaceParams?: boolean;
};

const ITEMS_PER_PAGE = 20;

export function goToWithQuery(query, opts: GoToWithQueryProps = {}) {
  const {
    preserveParams,
    pushHistory,
    replaceParams,
  } = opts;

  const q = queryFromUrl();

  const replaceParamsWith = {};
  if (preserveParams) {
    preserveParams.forEach((key: string) => {
      if (q[key]) {
        replaceParamsWith[key] = q[key];
      }
    });
  }

  const currentQuery = replaceParams ? replaceParamsWith : q;
  let href;

  if (typeof window !== 'undefined') {
    href = window.location.pathname;
  }

  const method = pushHistory ? Router.push : Router.replace;

  const newQuery = {
    ...currentQuery,
    ...query,
  };
  Object.entries(query).forEach(([k, v]) => {
    if (typeof v === 'undefined' || v === null) {
      delete newQuery[k];
    }
  });

  let qString = queryString(newQuery);
  if (qString.length >= 1) {
    qString = `?${qString}`;
  }

  let newUrl = `${href.split('?')[0]}${qString}`;

  const basePath = Router.router?.basePath;
  if (basePath && newUrl.startsWith(basePath)) {
    newUrl = newUrl.replace(basePath, '');
  }

  // This will force the page to re-render all the components.
  return method(Router.router.pathname, newUrl, {
    shallow: true,
  });
}

export type GoToWithFiltersProps = {
  isList?: boolean,
  itemsPerPage?: number,
  pushHistory?: boolean,
  resetLimitParams?: boolean,
  resetPage?: boolean,
};

// Legacy wrapper used by Logs/Filter. Prefer goToWithMixedFilters for new code.
export function goToWithFilters(
  query: any,
  additionalQuery: any,
  {
    itemsPerPage,
    pushHistory = false,
    resetLimitParams = false,
    resetPage = false,
  }: GoToWithFiltersProps,
) {
  goToWithMixedFilters(query, {}, {}, {
    itemsPerPage, listFilters: additionalQuery, pushHistory, resetLimitParams, resetPage,
  });
}

export type GoToWithMixedFiltersProps = {
  itemsPerPage?: number;
  listFilters?: { [key: string]: any };
  pushHistory?: boolean;
  resetLimitParams?: boolean;
  resetPage?: boolean;
};

export function goToWithMixedFilters(
  query: any,
  arrayFilters: { [key: string]: any[] },
  scalarFilters: { [key: string]: any },
  {
    itemsPerPage,
    listFilters,
    pushHistory = false,
    resetLimitParams = false,
    resetPage = false,
  }: GoToWithMixedFiltersProps,
) {
  let updatedQuery = { ...query };

  if (resetPage) {
    updatedQuery.page = 0;
  }

  Object.entries(arrayFilters).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      updatedQuery[`${k}[]`] = v.map(String);
    }
  });

  // Toggle individual values in/out of existing arrays
  if (listFilters) {
    Object.entries(listFilters).forEach(([k, v]) => {
      const value = String(v);
      const arrKey = `${k}[]`;
      let arr = updatedQuery[arrKey];
      if (arr && Array.isArray(arr)) {
        arr = arr.map(String);
        if (arr.includes(value)) {
          updatedQuery[arrKey] = remove(arr, val => val === value);
        } else {
          updatedQuery[arrKey] = arr.concat(value);
        }
      } else {
        updatedQuery[arrKey] = [value];
      }
    });
  }

  Object.entries(scalarFilters).forEach(([k, v]) => {
    updatedQuery[k] = v;
  });

  if (resetLimitParams) {
    updatedQuery[MetaQueryEnum.LIMIT] = itemsPerPage || ITEMS_PER_PAGE;
    updatedQuery[MetaQueryEnum.OFFSET] = 0;
  }

  goToWithQuery(updatedQuery, { pushHistory });
}
