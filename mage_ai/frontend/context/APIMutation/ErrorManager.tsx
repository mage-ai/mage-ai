import Ansi from 'ansi-to-react';
import React, { FC, memo, useRef, useState } from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import Text from '@oracle/elements/Text';
import styles from '@styles/scss/components/Error/API/ErrorManager.module.scss';
import { APIErrorType, APIMutationContextType } from './Context';
import { AlertTriangle } from '@mana/icons';
import { randomSample } from '@utils/array';

const POSITIONS = [
  'bottomLeft',
  'bottomRight',
  'right',
  'topLeft',
  'topRight',
];

type ErrorManagerProps = {
  dismissError: APIMutationContextType['dismissError'];
  errorRef: React.MutableRefObject<APIErrorType>;
  retry?: (event: any) => void;
};

const ErrorManager: FC<ErrorManagerProps> = memo(function ErrorManager({
  dismissError,
  errorRef,
  retry,
}: ErrorManagerProps) {
  const position = randomSample(POSITIONS);
  const {
    error,
  } = errorRef?.current?.response?.data ?? {};
  const {
    error: clientError,
  } = errorRef?.current?.client ?? {};

  const code = error?.code;
  const errors = error?.errors ?? clientError?.errors;
  const message = error?.message ?? clientError?.message;
  const type = error?.type ?? clientError?.type;

  return (
    <>
      <div className={[
        styles.errorManager,
        styles[position],
      ].filter(Boolean).join(' ')}>
        <Grid
          backgroundColor="blacklo"
          base
          borderColor="red"
          borders
          className={styles.errorContainer}
          padding={12}
          rowGap={12}
          templateColumns="auto"
          templateRows="auto auto"
          width="max-content"
        >
          <Grid
            rowGap={12}
            templateColumns="auto"
            templateRows="auto auto"
          >
            <Text bold monospace>
              {errorRef?.current?.message}
            </Text>

            {[code, type, message, errors?.length >= 1]?.some(Boolean) && <Divider />}

            {[code, type, message].map((val) => val && (
              <Text key={val} monospace>
                <Ansi>{String(val)}</Ansi>
              </Text>
            ))}

            {[code, type, message]?.some(Boolean) && <Divider short />}

            {errors?.length >= 1 && clientError && (
              <Text monospace>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                }}>
                  <Ansi>{errors?.join('\n')}</Ansi>
                </pre>
              </Text>
            )}
            {errors?.length >= 1 && !clientError && (
              <pre style={{
                whiteSpace: 'break-spaces',
              }}>
                <Text
                  inline
                  monospace
                >
                  {errors?.map((line: string) => (
                    <Ansi key={line}>{line}</Ansi>
                  ))}
                </Text>
              </pre>
            )}
          </Grid>

          <Divider />

          <Grid templateColumns="min-content">
            <ButtonGroup>
              <Button Icon={AlertTriangle} basic onClick={dismissError} small>
                Dismiss error
              </Button>

              {false &&
                <Button Icon={AlertTriangle} basic onClick={(event: any) => {
                  retry(event);
                }} small>
                  Retry request
                </Button>
              }
            </ButtonGroup>
          </Grid>
        </Grid>
      </div>
    </>
  );
});

export default ErrorManager;
