import { AxiosError } from 'axios';
import { ErrorDetailsType } from '@interfaces/ErrorsType';

// "message": "Request failed with status code 400",
// "name": "AxiosError",
// "config": {
//   "transitional": {
//     "silentJSONParsing": true,
//     "forcedJSONParsing": true,
//     "clarifyTimeoutError": false
//   },
//   "transformRequest": [
//     null
//   ],
//   "transformResponse": [
//     null
//   ],
//   "timeout": 0,
//   "xsrfCookieName": "XSRF-TOKEN",
//   "xsrfHeaderName": "X-XSRF-TOKEN",
//   "maxContentLength": -1,
//   "maxBodyLength": -1,
//   "env": {
//     "FormData": null
//   },
//   "headers": {
//     "Accept": "application/json, text/plain, */*",
//     "Content-Type": "application/json"
//   },
//   "data": "{\"browser_item\":{\"content\":\"test:\\n  object_type: pipeline\\n  object_uuid: test\\n  project: memory_upgrade_v2\\n  repo_path: /home/src/default_repo/mlops/mlops/memory_upgrade_v2\\n\",\"path\":\"/home/src/default_repo/mlops/mlops/memory_upgrade_v2/global_data_products.yaml111111111111111111111\"},\"api_key\":\"zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2\"}",
//   "method": "put",
//   "onDownloadProgress": null,
//   "onUploadProgress": null,
//   "responseType": "json",
//   "url": "http://localhost:6789/api/browser_items/%2Fhome%2Fsrc%2Fdefault_repo%2Fmlops%2Fmlops%2Fmemory_upgrade_v2%2Fglobal_data_products.yaml?api_key=zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2"
// },
// "code": "ERR_BAD_REQUEST",
// "status": 400
export type AxiosErrorType = {
  response: {
    data: { error: ErrorDetailsType } | Record<string, any>;
  };
} & AxiosError;