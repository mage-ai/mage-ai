import ErrorsType from '@interfaces/ErrorsType';

export function parseError(res) {
  const { error } = res;
  const {
    code,
    errors,
    message,
    type,
  } = error;
  let messages: string[] = [];
  if (errors) {
    if (errors?.__all__) {
      messages = errors?.__all__;
    } else if (Array.isArray(errors)) {
      messages = errors;
    } else {
      messages = Object.entries(errors).reduce((acc, [k, v]) => acc.concat(`${k}: ${v[0]}`), []);
    }
  } else {
    messages = error.messages;
  }

  return {
    ...error,
    code,
    errors,
    message,
    messages,
    type,
  };
}

export function handle(response) {
  if (response.data) {
    return Promise.resolve(response.data);
  } else if (response.json) {
    return response.json();
  }

  return Promise.resolve(response);
}

type OptsProps = {
  acceptErrorStatuses?: number[];
  callback?: any;
  errorMessage?: string;
  onErrorCallback?: (resp: any, err: {
    code: number;
    messages: string[];
  }) => void;
  successMessage?: string;
};

export function parseErrorFromResponse(res, opts: OptsProps = {}) {
  const {
    code,
    errors,
    exception,
    message,
    messages,
  } = parseError(res);

  const msgs = [];

  if (message) {
    msgs.push(...message.split('\n'));
  } else if (messages?.length >= 1) {
    msgs.push(...messages);
  } else {
    const toastErrMessage = opts.errorMessage || (messages?.[0] || errors);
    if (toastErrMessage) {
      msgs.push(toastErrMessage);
    }
  }

  if (exception) {
    msgs.push(exception);
  }

  return {
    code,
    messages: msgs,
  };
}

export function errorOrSuccess(response, opts: OptsProps = {}) {
  const {
    acceptErrorStatuses = [],
    callback,
    onErrorCallback,
    successMessage,
  } = opts;
  const { error } = response;

  if (error && !acceptErrorStatuses.includes(error?.code)) {
    const parsedErrors = parseErrorFromResponse(response);
    onErrorCallback?.(response, parsedErrors);

    return parsedErrors;
  } else {
    // Replace with some success notification
    // console.log(successMessage);
    // if (successMessage) {
    //   toast.success(successMessage, {
    //     position: toast.POSITION.BOTTOM_RIGHT,
    //   });
    // }

    return callback?.(response);
  }
}

export function onError(error: any, opts: OptsProps = {}) {
  const {
    errors,
    message,
    response,
  } = error;
  const resp = {
    error: {
      code: response?.status,
      messages: [
        errors || message,
      ],
    },
    ...response?.data,
  };

  const {
    callback,
  } = opts;

  callback?.(resp);

  return parseErrorFromResponse(resp, opts);
}

export function onSuccess(response: any, opts = {}) {
  if (response.status) {
    return handle(response).then(res => errorOrSuccess(res, opts));
  }

  return errorOrSuccess(response, opts);
}

export function displayErrorFromReadResponse(
  data: any,
  setErrors: (errors: ErrorsType) => void,
  links?: {
    href?: string;
    label: string;
    onClick?: () => void;
  }[],
) {
  let linksFinal = links || [];
  if (data?.error?.exception?.includes('Too many open files')) {
    const tooManyOpenFilesErrLink = [
      {
        href: 'https://docs.mage.ai/production/configuring-production-settings/overview#ulimit',
        label: 'Refer to the docs for troubleshooting this error.',
      },
    ];
    linksFinal = linksFinal.concat(tooManyOpenFilesErrLink);
  }
  if (data?.error) {
    const errors: ErrorsType = {
      errors: parseErrorFromResponse(data),
      links: linksFinal,
      response: data,
    };
    if (data?.error?.displayMessage) {
      errors.displayMessage = data.error.displayMessage;
    }
    setErrors?.(errors);
  } else {
    setErrors?.(null);
  }
}
