import Router from 'next/router';
import { ServerResponse } from 'http';

export function queryFromUrl(url: string = null): any {
  const query = {};
  let urlToTest = url;

  if (!url && typeof window !== 'undefined') {
    urlToTest = window.location.search;
  }

  if (urlToTest) {
    const params = new URLSearchParams(urlToTest.slice(1));
    // @ts-ignore
    Array.from(params.keys()).forEach(key => {
      // @ts-ignore
      const values = params.getAll(key);
      if (values.length === 1) {
        // @ts-ignore
        [query[key]] = values;
      } else {
        // @ts-ignore
        query[key] = values;
      }
    });
  }

  return query;
}

export function queryString(query: object = {}) {
  return Object.entries(query)
    .reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        let finalKey = key;
        if (!finalKey.match(/\[\]/)) {
          finalKey = `${finalKey}[]`;
        }
        // @ts-ignore
        return acc.concat(value.map((val) => `${finalKey}=${val}`));
      }
      // @ts-ignore
      return acc.concat(`${key}=${value}`);
    }, [])
    .join('&');
}

export const redirectToUrl = (url: string, server?: ServerResponse) => {
  if (server) {
    server.writeHead(302, {
      Location: url,
    });
    server.end();
  } else {
    Router.push(url);
  }
};
