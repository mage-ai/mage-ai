import Router from 'next/router';
import { ServerResponse } from 'http';

export type ParseUrlResult = any;

export function parseDynamicUrl(url: string, template: string): ParseUrlResult {
  const parsedUrl = new URL(url, window.location.origin);
  const pathname = parsedUrl.pathname;

  // Remove any empty segments caused by leading/trailing slashes
  const urlSegments = pathname.split('/').filter(segment => segment);
  const templateSegments = template.split('/').filter(segment => segment);

  const result: ParseUrlResult = {};

  templateSegments.forEach((segment, index) => {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const key = segment.slice(1, -1);

      // Handling catch-all segment [...slug]
      if (key.startsWith('...')) {
        const slugKey = key.slice(3);
        result[slugKey] = urlSegments.slice(index);
      } else {
        result[key] = urlSegments[index];
      }
    }
  });

  // Extract query parameters
  const query: { [key: string]: string } = {};
  parsedUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  if (Object.keys(query).length > 0) {
    result.query = query;
  }

  // Extract hash
  if (parsedUrl.hash) {
    result.hash = parsedUrl.hash.substring(1); // Remove leading '#'
  }

  return result;
}

export function queryFromUrl(url: string = null): any {
  const query = {};
  let urlToTest = url;

  if (!url && typeof window !== 'undefined') {
    urlToTest = window.location.search;
  }

  if (urlToTest) {
    const params = new URLSearchParams(urlToTest.split('?').slice(1).join(''));
    // @ts-ignore
    Array.from(params.keys()).forEach((key: string) => {
      const isList = key.match(/\[\]/);

      // @ts-ignore
      const values = params.getAll(key);
      if (values.length === 1 && !isList) {
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
        return acc.concat(value.map(val => `${finalKey}=${encodeURIComponent(val)}`));
      }
      // @ts-ignore
      return acc.concat(`${key}=${encodeURIComponent(value)}`);
    }, [])
    .join('&');
}

export function filterQuery(query: object = {}, keysToInclude: string[] = []) {
  return Object.entries(query).reduce((acc, [key, value]) => {
    if (
      keysToInclude.includes(key) &&
      (!Array.isArray(value) || (Array.isArray(value) && value.length > 0))
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export const redirectToUrl = (url: string, server?: ServerResponse) => {
  if (server) {
    if (typeof server?.writeHead === 'function') {
      server.writeHead(302, {
        Location: url,
      });
      server.end();
    }
  } else {
    Router.push(url);
  }
};

export function snakeToHyphens(url: string): string {
  return url.replace(/_/g, '-');
}

export function hyphensToSnake(url: string): string {
  return url.replace(/-/g, '_');
}
