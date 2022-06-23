import { queryString } from '@utils/url';

export function getHost() {
  const windowDefined = typeof window !== 'undefined';
  const LOCALHOST = 'localhost';
  const PORT = 5789;
  /*
  The CLOUD_BASE_PATH placeholder below is used for replacing with base
  paths required by cloud notebooks. The backend will detect the notebook type
  and replace the placeholder when the mage_ai tool is launched. We may not
  know the base path until the tool is launched.
  */
  const CLOUD_BASE_PATH = '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_';

  let host = LOCALHOST;
  let protocol = 'http://';
  let basePath = '';

  if (windowDefined) {
    host = window.location.hostname;
  }

  if (host === LOCALHOST) {
    host = `${host}:${PORT}`;
  } else {
    protocol = 'https://';

    if (windowDefined) {
      if (!window.location.protocol?.match(/https/)) {
        protocol = 'http://';
      }

      if (!!window.location.port) {
        host = `${host}:${window.location.port}`;
      }
    }

  }
  if (!CLOUD_BASE_PATH.includes('CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER')) {
    basePath = CLOUD_BASE_PATH;
  }

  return `${protocol}${host}${basePath}`;
}

export function buildUrl(
  resource: string,
  id: string = null,
  childResource: string = null,
  childId: string = null,
  query: any = {},
): string {
  let path: string =`${getHost()}/${resource}`;

  if (id) {
    path = `${path}/${id}`;
  }
  if (childResource) {
    path = `${path}/${childResource}`;
  }
  if (childId) {
    path = `${path}/${childId}`;
  }

  if (Object.values(query).length >= 1) {
    path = `${path}?${queryString(query)}`;
  }

  return path;
}

export default {
  buildUrl,
};
