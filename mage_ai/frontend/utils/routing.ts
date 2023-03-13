import Router from 'next/router';

import {
  queryFromUrl,
  queryString,
} from '@utils/url';
import { remove } from '@utils/array';

type GoToWithQueryProps = {
  replaceParams?: boolean;
  pushHistory?: boolean;
};

export const LIMIT_PARAM = '_limit';
export const OFFSET_PARAM = '_offset';
const ITEMS_PER_PAGE = 20;

export function goToWithQuery(query, opts: GoToWithQueryProps = {}) {
  const {
    replaceParams,
    pushHistory,
  } = opts;
  const currentQuery = replaceParams ? {} : queryFromUrl();
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

  const newUrl = `${href.split('?')[0]}${qString}`;

  // This will force the page to re-render all the components.
  return method(Router.router.pathname, newUrl, {
    shallow: true,
  });
}

export function goToWithFilters(
  query: any,
  additionalQuery: any,
  {
    addingMultipleValues,
    isList,
    itemsPerPage,
    resetLimitParams,
  }: {
    addingMultipleValues?: boolean;
    isList?: boolean,
    itemsPerPage?: number,
    resetLimitParams?: boolean,
  },
) {
  let updatedQuery = { ...query };

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
    updatedQuery[LIMIT_PARAM] = itemsPerPage || ITEMS_PER_PAGE;
    updatedQuery[OFFSET_PARAM] = 0;
  }

  goToWithQuery(updatedQuery);
}
