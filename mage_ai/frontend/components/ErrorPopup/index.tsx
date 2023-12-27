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
import { isObject } from '@utils/hash';

type ErrorPopupProps = {
  displayMessage?: string;
  errors?: ErrorType;
  links?: {
    closeAfterClick?: boolean;
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
    errors: errorsFromResponse,
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

  const errors = Array.isArray(errorsFromResponse)
    ? errorsFromResponse
    : isObject(errorsFromResponse)
      ? Object.values(errorsFromResponse).filter((value) => typeof value === 'string')
      : [errorsFromResponse ? String(errorsFromResponse) : ''];

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
              {messages.map((msg, idx) => (
                <Text
                  // @ts-ignore
                  dangerouslySetInnerHTML={{
                    // @ts-ignore
                    __html: msg.replaceAll(' ', '&nbsp;'),
                  }}
                  default
                  disableWordBreak
                  key={`${msg}-${idx}`}
                  monospace
                />
              ))}
            </Spacing>
          }
        </Spacing>
      )}

      {(errors && errors?.[0] !== '') && (
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
              {errors.map((msg, idx) => (
                <Text
                  // @ts-ignore
                  dangerouslySetInnerHTML={{
                    // @ts-ignore
                    __html: msg.replaceAll(' ', '&nbsp;'),
                  }}
                  default
                  disableWordBreak
                  // @ts-ignore
                  key={`${msg}-${idx}`}
                  monospace
                />
              ))}
            </Spacing>
          )}
        </Spacing>
      )}

      {links?.map(({ closeAfterClick, href, label, onClick }, idx) => (
        <Spacing key={`${label}-${idx}`} mt={2}>
          <Link
            href={href}
            large
            onClick={onClick
              ? () => {
                onClick?.();
                if (closeAfterClick && onClose) {
                  onClose?.();
                }
              }
              : null
            }
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
