import Router from 'next/router';

import {
  queryFromUrl,
  queryString,
} from '@utils/url';

type GoToWithQueryProps = {
  replaceParams?: boolean;
  pushHistory?: boolean;
};

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
