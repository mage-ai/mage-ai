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
    } else {
      messages = Object.entries(errors).reduce((acc, [k, v]) => acc.concat(`${k}: ${v[0]}`), []);
    }
  } else {
    messages = error.messages;
  }

  return {
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
}

type OptsProps = {
  acceptErrorStatuses?: number[];
  callback?: any;
  errorMessage?: string;
  onErrorCallback?: (resp: any) => void;
  successMessage?: string;
};

function parseErrorFromResponse(res, opts: OptsProps = {}) {
  const {
    code,
    errors,
    message,
    messages,
  } = parseError(res);

  const msgs = [];
  if (message) {
    msgs.push(message);
  }
  const toastErrMessage = opts.errorMessage || (messages?.[0] || errors);
  if (toastErrMessage) {
    msgs.push(toastErrMessage);
  }

  // Replace with some error notification
  // console.error(msgs.join(' '));
  // toast.error(msgs.join(' '), {
  //   position: toast.POSITION.BOTTOM_RIGHT,
  //   toastId: code,
  // });
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
    parseErrorFromResponse(response);

    return onErrorCallback?.(response);
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

  parseErrorFromResponse(resp, opts);

  return callback?.(resp);
}

export function onSuccess(response: any, opts = {}) {
  if (response.status) {
    return handle(response).then(res => errorOrSuccess(res, opts));
  }

  return errorOrSuccess(response, opts);
}
