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

type ErrorPopupProps = {
  displayMessage?: string;
  errors?: {
    messages: string[];
  };
  links?: {
    label: string;
    onClick: () => void;
  }[];
  onClose: () => void;
  response: {
    error: {
      errors: string[];
      exception: string;
      message: string;
    };
  };
};

function ErrorPopup({
  displayMessage,
  errors: errorsProp,
  links,
  onClose,
  response,
}: ErrorPopupProps) {
  const [stackTraceVisible, setStackTraceVisible] = useState(false);
  const { messages } = errorsProp || {};

  const {
    errors,
    exception,
  } = response?.error || {};

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

      <Spacing mt={1}>
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

        {/* {messages?.length && (
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
        )} */}
      </Spacing>

      {links?.map(({ label, onClick }, idx) => (
        <Spacing key={label} mt={2}>
          <Link
            large
            onClick={onClick}
            underline
            warning
          >
            {label}
          </Link>
        </Spacing>
      ))}


      {errors && (
        <Spacing mt={3}>
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
    </ErrorPopupStyle>
  );
}

export default ErrorPopup;
