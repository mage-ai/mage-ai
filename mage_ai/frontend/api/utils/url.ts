import { queryString } from '@utils/url';

export const DEFAULT_HOST: string = 'localhost';
export const DEFAULT_PORT: string = '6789';

function getHostCore(
  windowDefined: boolean,
  defaultHost: string = DEFAULT_HOST,
  defaultPort: string = DEFAULT_PORT,
){
  let host = defaultHost;
  if(windowDefined){
    host = window.location.hostname;
  }
  if(host === defaultHost){
    host = `${host}:${defaultPort}`;
  } else if (windowDefined && !!window.location.port){
    host = `${host}:${window.location.port}`;
  }

  /*
  The CLOUD_BASE_PATH placeholder below is used for replacing with base
  paths required by cloud notebooks. The backend will detect the notebook type
  and replace the placeholder when the mage_ai tool is launched. We may not
  know the base path until the tool is launched.
  */
  const CLOUD_BASE_PATH = '/CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_';
  let basePath = '';
  if (!CLOUD_BASE_PATH.includes('CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER')) {
    basePath = CLOUD_BASE_PATH;
  }

  return `${host}${basePath}`;
}

function getProtocol(
  windowDefined: boolean,
  host: string,
  defaultHost: string = DEFAULT_HOST,
){
  let protocol = 'http://';
  if(host !== defaultHost){
    protocol = 'https://';
    if(windowDefined && !window.location.protocol?.match(/https/)) {
      protocol = 'http://';
    }
  }
  return protocol;
}

function getHost(){
  const windowDefined = typeof window !== 'undefined';
  const LOCALHOST = DEFAULT_HOST;
  const PORT = DEFAULT_PORT;

  const host = getHostCore(windowDefined, LOCALHOST, PORT);
  const protocol = getProtocol(windowDefined, host, LOCALHOST);

  return `${protocol}${host}/api`;
}


export function getWebSocket(path='') {
  const windowDefined = typeof window !== 'undefined';
  const LOCALHOST = DEFAULT_HOST;
  const PORT = DEFAULT_PORT;

  const host = getHostCore(windowDefined, LOCALHOST, PORT);

  let prefix = 'ws://';
  if (windowDefined && window.location.protocol?.match(/https/)) {
    prefix = 'wss://';
  }
  return `${prefix}${host}/websocket/${path}`;
}

export function buildUrl(
  resource: string,
  id: string = null,
  childResource: string = null,
  childId: string = null,
  query: any = {},
  grandchildResource: string = null,
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
  if (grandchildResource) {
    path = `${path}/${grandchildResource}`;
  }

  if (Object.values(query || {}).length >= 1) {
    path = `${path}?${queryString(query)}`;
  }

  return path;
}

export default buildUrl;
