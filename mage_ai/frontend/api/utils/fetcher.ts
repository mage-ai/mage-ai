// import AuthToken from './AuthToken';
import axios from 'axios';
import { queryFromUrl } from '@utils/url';

type FetcherOptionsType = {
  body?: any;
  ctx?: any;
  method?: any;
  onUploadProgress?: (progress: any) => void;
  query?: any;
  token?: string;
};

export const DELETE: 'DELETE' = 'DELETE';
export const GET: 'GET' = 'GET';
export const POST: 'POST' = 'POST';
export const PUT: 'PUT' = 'PUT';

function preprocess(url: string, opts: FetcherOptionsType = {}) {
  const {
    body,
    ctx,
    method = GET,
    query = {},
    token,
  } = opts;

  const headers = {
    'Content-Type': 'application/json',
  };
  const data: any = {
    method,
  };

  if (body) {
    const { file } = body;
    if (file) {
      const {
        name,
        size,
        type,
      } = file;
      const formData = new FormData();
      const key: string = Object.keys(body).filter(k => k !== 'file')[0];
      formData.set(
        'json_root_body',
        JSON.stringify({
          [key]: body[key],
          api_key: process.env.NEXT_PUBLIC_API_KEY,
        }),
      );
      formData.append('file', file);
      data.body = formData;
      delete headers['Content-Type'];
    } else {
      data.body = JSON.stringify({
        ...body,
        api_key: process.env.NEXT_PUBLIC_API_KEY,
      });
    }
  }

  // const authToken = ctx && ctx.auth ? ctx.auth : new AuthToken(token);
  // const oauthToken: string | undefined = authToken.authorizationString;
  // if (oauthToken) {
  //   headers['Authorization'] = oauthToken;
  // }

  data.headers = new Headers(headers);

  const queryString = Object.entries({
    ...queryFromUrl(url),
    ...query,
    api_key: process.env.NEXT_PUBLIC_API_KEY,
  }).reduce((arr, [k, v]) => arr.concat(`${k}=${v}`), []).join('&');

  return {
    data,
    headers,
    method,
    queryString,
    url: url.split('?')[0],
  };
}

export function buildFetch(urlArg: string, opts: FetcherOptionsType = {}) {
  const {
    data,
    queryString,
    url,
  } = preprocess(urlArg, opts);

  return fetch(`${url}?${queryString}`, data);
}

export function buildFetchV2(urlArg: string, opts: FetcherOptionsType = {}) {
  const {
    data,
    headers,
    method,
    queryString,
    url,
  } = preprocess(urlArg, opts);

  return axios.request({
    data: data.body,
    headers,
    method,
    onUploadProgress: opts?.onUploadProgress,
    url: `${url}?${queryString}`,
  });
}

export function fetcher(url: string, opts: FetcherOptionsType = {}) {
  return buildFetch(url, opts).then(res => res.json());
}
