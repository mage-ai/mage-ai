import { useState } from 'react';

import Button from '@oracle/elements/Button';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Close } from '@oracle/icons';
import {
  CloseButtonContainerStyle,
  ErrorPopupStyle,
} from './index.style';
import { ErrorType, ErrorResponseType } from '@interfaces/ErrorsType';

type ErrorPopupProps = {
  displayMessage?: string;
  errors?: ErrorType;
  links?: {
    href?: string;
    label: string;
    onClick?: () => void;
  }[];
  onClose?: () => void;
  response?: ErrorResponseType;
};

function ErrorPopup({
  displayMessage: displayMessageProp,
  errors: errorsProp,
  links,
  onClose,
  response,
}: ErrorPopupProps) {
  const [stackTraceVisible, setStackTraceVisible] = useState(false);
  const [tracebackVisible, setTracebackVisible] = useState(false);
  const {
    messages: messagesProp,
  } = errorsProp || {};

  const {
    errors,
    exception,
    message: messageFromResponse,
  } = response?.error || {};

  let displayMessage = displayMessageProp;
  let messages = messagesProp;
  if (messageFromResponse) {
    messages = messageFromResponse.split('\n');
  }

  if (!exception && !displayMessage && messages?.[0]) {
    displayMessage = messages[0];
    messages = null;
  }

  return (
    <ErrorPopupStyle>
      <CloseButtonContainerStyle>
        <Button
          iconOnly
          noBackground
          noBorder
          noPadding
          onClick={onClose}
          title="Close errors"
        >
          <Close />
        </Button>
      </CloseButtonContainerStyle>

      <Text bold large>
        Error
      </Text>

      {displayMessage && (
        <Spacing mt={1}>
          <Text default>
            {displayMessage}
          </Text>
        </Spacing>
      )}

      {exception && (
        <Spacing mt={1}>
          <Text
            default
            disableWordBreak
            monospace
          >
            {exception}
          </Text>
        </Spacing>
      )}

      {messages?.length > 0 && (
        <Spacing mt={2}>
          <Text bold large>
            Traceback (<Link
              onClick={() => setTracebackVisible(prev => !prev)}
              preventDefault
              warning
            >
              {tracebackVisible ? 'hide' : 'show'} traceback
            </Link>)
          </Text>

          {tracebackVisible &&
            <Spacing mt={1}>
              {messages.map(msg => (
                <Text
                  // @ts-ignore
                  dangerouslySetInnerHTML={{
                    __html: msg.replaceAll(' ', '&nbsp;'),
                  }}
                  default
                  disableWordBreak
                  key={msg}
                  monospace
                />
              ))}
            </Spacing>
          }
        </Spacing>
      )}

      {errors && (
        <Spacing mt={2}>
          <Text bold large>
            Stack trace (<Link
              onClick={() => setStackTraceVisible(prev => !prev)}
              preventDefault
              warning
            >
              {stackTraceVisible ? 'hide' : 'show'} stack trace
            </Link>)
          </Text>

          {stackTraceVisible && (
            <Spacing mt={1}>
              {errors.map(msg => (
                <Text
                  // @ts-ignore
                  dangerouslySetInnerHTML={{
                    __html: msg.replaceAll(' ', '&nbsp;'),
                  }}
                  default
                  disableWordBreak
                  key={msg}
                  monospace
                />
              ))}
            </Spacing>
          )}
        </Spacing>
      )}

      {links?.map(({ href, label, onClick }) => (
        <Spacing key={label} mt={2}>
          <Link
            href={href}
            large
            onClick={onClick}
            openNewWindow={!!href}
            underline
            warning
          >
            {label}
          </Link>
        </Spacing>
      ))}
    </ErrorPopupStyle>
  );
}

export default ErrorPopup;
