import { ApiResourceType } from './index';
import { ErrorDetailsType } from '@interfaces/ErrorsType';
import { HandlersType } from '@api/callbacks';

type ResourceType = Record<string, any>;

type ResponseType = {
  data?: Record<typeof ApiResourceType, ResourceType>;
};

type ErrorResponseType = {
  error?: ErrorDetailsType;
};

export function handleResponse(handlers?: HandlersType & {
  parse?: string | ((response: ResponseType) => any);
}) {
  return {
    ...handlers,
    onError: (error: ResponseType) => {
      console.log(error);
      handlers?.onError(error);
    },
    onSuccess: (response: ErrorResponseType) => {
      console.log(response);

      const parse = handlers?.parse;
      handlers?.onSuccess(parse
        ? typeof parse === 'string'
          ? response[parse]
          : parse(response)
        : response,
      );
    },
  };
}
