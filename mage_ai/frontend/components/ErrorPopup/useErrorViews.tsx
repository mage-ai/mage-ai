import { useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Close } from '@oracle/icons';
import { CloseButtonContainerStyle, ErrorPopupStyle } from './index.style';
import { ErrorType, ErrorResponseType } from '@interfaces/ErrorsType';
import { isObject } from '@utils/hash';

export type UseErrorViewsProps = {
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
  stackTraceVisible?: boolean;
  tracebackVisible?: boolean;
};

export default function useErrorViews({
  displayMessage: displayMessageProp,
  errors: errorsProp,
  links,
  onClose,
  response,
  stackTraceVisible: stackTraceVisibleProp,
  tracebackVisible: tracebackVisibleProp,
}: UseErrorViewsProps) {
  const [stackTraceVisible, setStackTraceVisible] = useState(stackTraceVisibleProp);
  const [tracebackVisible, setTracebackVisible] = useState(tracebackVisibleProp);
  const { messages: messagesProp } = errorsProp || {};

  const {
    errors: errorsFromResponse,
    exception,
    message: messageFromResponse,
  } = response?.error || {};

  let displayMessage = displayMessageProp;
  let messages = messagesProp;
  if (messageFromResponse) {
    messages = messageFromResponse?.split('\n');
  }

  if (!exception && !displayMessage && messages?.[0]) {
    displayMessage = messages[0];
    messages = null;
  }

  const errors = useMemo(
    () =>
      Array.isArray(errorsFromResponse)
        ? errorsFromResponse
        : isObject(errorsFromResponse)
          ? Object.values(errorsFromResponse).filter(value => typeof value === 'string')
          : [errorsFromResponse ? String(errorsFromResponse) : ''],
    [errorsFromResponse],
  );

  const displayMessageMemo = useMemo(
    () => displayMessage && <Text default>{displayMessage}</Text>,
    [displayMessage],
  );

  const exceptionMemo = useMemo(
    () =>
      exception && (
        <Text default disableWordBreak monospace>
          {exception}
        </Text>
      ),
    [exception],
  );

  const tracebackMemo = useMemo(
    () =>
      messages?.length > 0 && (
        <>
          <Text bold large>
            Traceback (
            <Link onClick={() => setTracebackVisible(prev => !prev)} preventDefault warning>
              {tracebackVisible ? 'hide' : 'show'} traceback
            </Link>
            )
          </Text>

          {tracebackVisible && (
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
          )}
        </>
      ),
    [messages, setTracebackVisible, tracebackVisible],
  );

  const stackTraceMemo = useMemo(
    () =>
      errors &&
      errors?.[0] !== '' && (
        <>
          <Text bold large>
            Stack trace (
            <Link onClick={() => setStackTraceVisible(prev => !prev)} preventDefault warning>
              {stackTraceVisible ? 'hide' : 'show'} stack trace
            </Link>
            )
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
        </>
      ),
    [errors, setStackTraceVisible, stackTraceVisible],
  );

  const linksMemo = useMemo(
    () =>
      links?.map(({ closeAfterClick, href, label, onClick }, idx) => (
        <Spacing key={`${label}-${idx}`} mt={2}>
          <Link
            href={href}
            large
            onClick={
              onClick
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
      )),
    [links, onClose],
  );

  return {
    displayMessage: displayMessageMemo,
    exception: exceptionMemo,
    links: linksMemo,
    stackTrace: stackTraceMemo,
    traceback: tracebackMemo,
  };
}
