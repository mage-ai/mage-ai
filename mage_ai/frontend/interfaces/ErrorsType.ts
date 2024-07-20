export enum ErrorCodeEnum {
  CODE_401 = 401,
  CODE_402 = 402,
  CODE_403 = 403,
  CODE_404 = 404,
  CODE_500 = 500,
}

export interface ErrorDetailsType {
  code?: string;
  error?: {
    type?: string;
    message?: string;
    traceback?: string[];
  };
  exception?: string | any;
  code_context?: string[];
  code_context_formatted?: string[];
  line_number?: number;
  message?: string;
  message_formatted?: string;
  stacktrace?: string[];
  stacktrace_formatted?: string[];
  type?: string;
}

export type ErrorResponseType = {
  error?: {
    exception?: string;
  } & ErrorDetailsType;
  status?: number;
  url_parameters?: {
    block_uuid?: string;
    pk?: string;
    resource?: string;
  };
};

export type ErrorType = {
  code: ErrorCodeEnum;
  messages: string[];
};

export default interface ErrorsType {
  displayMessage?: string;
  errors?: ErrorType;
  links?: {
    closeAfterClick?: boolean;
    href?: string;
    label: string;
    onClick?: () => void;
  }[];
  response?: ErrorResponseType;
}
