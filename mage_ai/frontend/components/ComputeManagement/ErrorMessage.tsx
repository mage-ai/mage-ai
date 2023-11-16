import { renderToString } from 'react-dom/server';

import Text from '@oracle/elements/Text';
import { ErrorMessageType } from '@interfaces/ComputeServiceType';

type ErrorMessageProps = {
  danger?: boolean;
  error: ErrorMessageType;
  large?: boolean;
  small?: boolean;
  warning?: boolean;
}

function ErrorMessage({
  danger,
  error,
  large,
  small,
  warning,
}: ErrorMessageProps) {
  const {
    message: messageInit,
    variables,
  } = error;

  let errorHTML = messageInit;

  if (variables) {
    Object.entries(variables || {}).forEach(([key, value]) => {
      errorHTML = errorHTML.replace(
        `{{${key}}}`,
        renderToString(
          <Text
            danger={danger}
            inline
            large={large}
            muted={!danger && !warning}
            small={small}
            warning={warning}
            {...(value || {})}
          >
            {key}
          </Text>
        ),
      )
    });
  }

  return (
    <Text
      danger={danger}
      // @ts-ignore
      dangerouslySetInnerHTML={{
        __html: errorHTML,
      }}
      muted={!danger && !warning}
      large={large}
      small={small}
      warning={warning}
    />
  );

}

export default ErrorMessage;
