import * as React from 'react';

export interface APIErrorType {
  client?: {
    error: {
      errors: string[];
      message: string;
      type: string;
    };
  };
  message: string;
  name: string;
  config: {
    headers: {
      Accept: string;
      'Content-Type': string;
    };
    data: string;
    method: string;
    onDownloadProgress: any;
    onUploadProgress: any;
    responseType: string;
    signal: any;
    url: string;
  };
  response?: any;
  code: string;
  status: number;
  // {
  //   "data": {
  //     "error": {
  //       "code": 404,
  //       "message": "Record not found.",
  //       "type": "record_not_found"
  //     },
  //     "status": 404
  //   },
  //   "status": 404,
  //   "statusText": "Not Found",
  //   "headers": {
  //     "content-length": "99",
  //     "content-type": "application/json"
  //   },
  //   "config": {
  //     "transitional": {
  //       "silentJSONParsing": true,
  //       "forcedJSONParsing": true,
  //       "clarifyTimeoutError": false
  //     },
  //     "transformRequest": [
  //       null
  //     ],
  //     "transformResponse": [
  //       null
  //     ],
  //     "timeout": 0,
  //     "xsrfCookieName": "XSRF-TOKEN",
  //     "xsrfHeaderName": "X-XSRF-TOKEN",
  //     "maxContentLength": -1,
  //     "maxBodyLength": -1,
  //     "env": {
  //       "FormData": null
  //     },
  //     "headers": {
  //       "Accept": "application/json, text/plain, */*",
  //       "Content-Type": "application/json"
  //     },
  //     "data": "{\"execution_framework\":{\"template\":{\"description\":\"Fetch GitHub repository\",\"inputs\":{\"text\":{\"options\":[],\"style\":{\"input_type\":null,\"multiline\":null},\"type\":\"text_field\"}},\"name\":\"GitHub repository loader\",\"uuid\":\"github\",\"variables\":{\"url\":{\"description\":\"GitHub repository URL\",\"input\":\"text\",\"name\":\"Repo URL\",\"required\":true,\"types\":[\"string\"],\"uuid\":null}}}},\"api_key\":\"zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2\"}",
  //     "method": "post",
  //     "onDownloadProgress": null,
  //     "onUploadProgress": null,
  //     "responseType": "json",
  //     "signal": null,
  //     "url": "http://localhost:6789/api/execution_frameworks/mager_rager_pipeline/pipelines?_http_error_codes=true&api_key=zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2"
  //   },
  //   "request": {}
  // }
}

export type APIMutationProviderProps = {
  base?: boolean;
  children: React.ReactNode;
};

export type TargetType = {
  content: React.ReactNode | null;
  rect: DOMRect | null;
  target: HTMLElement | null;
};

export interface APIMutationContextType {
  dismissError: () => void;
  dismissTarget: (target?: TargetType) => void;
  renderError: (
    error: APIErrorType & {
      client: {
        error: {
          errors: string[];
          message: string;
          type: string;
        };
      };
    },
    request: (event: MouseEvent) => void,
  ) => void;
  renderTarget: (target: TargetType) => void;
}

const invariantViolation = () => {
  throw new Error(
    `Attempted to call useMutate outside of APIMutation Context.
    Make sure your app is rendered inside APIMutationProvider.`,
  );
};

export const APIMutationContext = React.createContext<APIMutationContextType>({
  dismissError: invariantViolation,
  dismissTarget: invariantViolation,
  renderError: invariantViolation,
  renderTarget: invariantViolation,
});
APIMutationContext.displayName = 'APIMutationContext';
