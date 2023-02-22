import axios from 'axios';

import AuthToken from '@api/utils/AuthToken';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { queryFromUrl } from '@utils/url';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || OAUTH2_APPLICATION_CLIENT_ID;

type FetcherOptionsType = {
  body?: any;
  ctx?: any;
  method?: any;
  onUploadProgress?: (progress: any, opts?: {
    body: {
      [key: string]: number | string;
    };
    query: {
      [key: string]: number | string;
    };
  }) => void;
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
    const { file, file_json_only: fileJsonOnly } = body;
    if (file && !fileJsonOnly) {
      const {
        name,
        size,
        type,
      } = file;
      const formData = new FormData();
      const key: string = Object.keys(body).filter(k => k !== 'file')[0];
      const jsonRootBody = JSON.stringify({
        api_key: API_KEY,
        [key]: body[key],
      });
      formData.set(
        'json_root_body',
        jsonRootBody,
      );
      formData.append('file', file);
      data.body = formData;
      delete headers['Content-Type'];
    } else {
      data.body = JSON.stringify({
        ...body,
        api_key: API_KEY,
      });
    }
  }

  const authToken = ctx && ctx.auth ? ctx.auth : new AuthToken(token);
  const oauthToken: string | undefined = authToken.authorizationString;
  if (oauthToken) {
    headers['Authorization'] = oauthToken;
  }

  data.headers = new Headers(headers);

  const queryObj = {
    ...queryFromUrl(url),
    ...query,
  };
  if (API_KEY) {
    queryObj.api_key = API_KEY;
  }
   const queryString = Object.entries(queryObj)
    .reduce((arr, [k, v]) => arr.concat(`${k}=${v}`), []).join('&');

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

  const finalUrl = queryString ? `${url}?${queryString}` : url;

  return fetch(finalUrl, data);
}

export function buildFetchV2(urlArg: string, opts: FetcherOptionsType = {}) {
  const {
    data,
    headers,
    method,
    queryString,
    url,
  } = preprocess(urlArg, opts);

  const finalUrl = queryString ? `${url}?${queryString}` : url;

  return axios.request({
    data: data.body,
    headers,
    method,
    onUploadProgress: opts?.onUploadProgress
      ? e => opts.onUploadProgress(e, {
        body: opts?.body,
        query: opts?.query,
      })
      : null,
    url: finalUrl,
  });
}

export function fetcher(url: string, opts: FetcherOptionsType = {}) {
  return buildFetch(url, opts).then(res => res.clone().json());
}
