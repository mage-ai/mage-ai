import { useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Close } from '@oracle/icons';
import { ErrorPopupStyle } from './index.style';

type ErrorPopupProps = {
  displayMessage?: string;
  errors?: {
    messages: string[];
  };
  onClose: () => void;
  response: {
    error: {
      errors: string[];
    };
  };
};

function ErrorPopup({
  displayMessage,
  errors: errorsProp,
  onClose,
  response,
}: ErrorPopupProps) {
  const [stackTraceVisible, setStackTraceVisible] = useState(false);
  const { messages } = errorsProp;

  const {
    errors,
  } = response?.error || {};

  return (
    <ErrorPopupStyle>
      <FlexContainer justifyContent="flex-end">
        <Button
          iconOnly
          noBorder
          noPadding
          onClick={onClose}
          title="Close errors"
        >
          <Close />
        </Button>
      </FlexContainer>

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

        {messages?.length && (
          <Spacing mt={1}>
            {messages.map(msg => (
              <Text
                default
                monospace
                key={msg}
                // @ts-ignore
                dangerouslySetInnerHTML={{
                  __html: msg.replaceAll(' ', '&nbsp;'),
                }}
              />
            ))}
          </Spacing>
        )}
      </Spacing>


      {errors && (
        <Spacing mt={3}>
          <Text bold large>
            Stack trace (<Link
              muted
              onClick={() => setStackTraceVisible(prev => !prev)}
              preventDefault
            >
              {stackTraceVisible ? 'hide' : 'show'} stack trace
            </Link>)
          </Text>

          {stackTraceVisible && (
            <Spacing mt={1}>
              {errors.map(msg => (
                <Text
                  default
                  monospace
                  key={msg}
                  // @ts-ignore
                  dangerouslySetInnerHTML={{
                    __html: msg.replaceAll(' ', '&nbsp;'),
                  }}
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
