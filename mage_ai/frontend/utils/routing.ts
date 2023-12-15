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

  const basePath = Router.router.basePath;
  if (basePath && newUrl.startsWith(basePath)) {
    newUrl = newUrl.replace(basePath, '');
  }

  // This will force the page to re-render all the components.
  return method(Router.router.pathname, newUrl, {
    shallow: true,
  });
}

export type GoToWithFiltersProps = {
  addingMultipleValues?: boolean;
  isList?: boolean,
  itemsPerPage?: number,
  pushHistory?: boolean,
  resetLimitParams?: boolean,
  resetPage?: boolean,
};

export function goToWithFilters(
  query: any,
  additionalQuery: any,
  {
    addingMultipleValues,
    isList,
    itemsPerPage,
    pushHistory = false,
    resetLimitParams = false,
    resetPage = false,
  }: GoToWithFiltersProps,
) {
  let updatedQuery = { ...query };

  if (resetPage) {
    updatedQuery.page = 0;
  }

  if (addingMultipleValues) {
    Object.entries(additionalQuery).forEach(([k1, v]) => {
      if (Array.isArray(v)) {
        const k2 = `${k1}[]`;
        updatedQuery[k2] = v.map(String);
      }
    });
  } else if (isList) {
    Object.entries(additionalQuery).forEach(([k1, v]) => {
      const value = String(v);
      const k2 = `${k1}[]`;
      let arr = updatedQuery[k2];
      if (arr && Array.isArray(arr)) {
        arr = arr.map(String);
        if (arr.includes(value)) {
          updatedQuery[k2] = remove(arr, val => val === value);
        } else {
          updatedQuery[k2] = arr.concat(value);
        }
      } else {
        updatedQuery[k2] = [value];
      }
    });
  } else {
    updatedQuery = {
      ...updatedQuery,
      ...additionalQuery,
    };
  }

  if (resetLimitParams) {
    updatedQuery[MetaQueryEnum.LIMIT] = itemsPerPage || ITEMS_PER_PAGE;
    updatedQuery[MetaQueryEnum.OFFSET] = 0;
  }

  goToWithQuery(updatedQuery, { pushHistory });
}
