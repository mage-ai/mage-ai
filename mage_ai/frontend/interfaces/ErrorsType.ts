export type ErrorResponseType = {
  error?: {
    errors?: string[];
    code?: number;
    exception?: string;
    message?: string;
    type?: string;
  };
  status?: number;
  url_parameters?: {
    block_uuid?: string;
    pk?: string;
    resource?: string;
  };
};

export type ErrorType = {
  code: number;
  messages: string[];
};

export default interface ErrorsType {
  displayMessage?: string;
  errors?: ErrorType;
  links?: {
    href?: string;
    label: string;
    onClick?: () => void;
  }[];
  response?: ErrorResponseType;
}
