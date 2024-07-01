import Ansi from 'ansi-to-react';
import React, { FC, memo, useRef, useState } from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import Text from '@oracle/elements/Text';
import styles from '@styles/scss/components/Error/API/ErrorManager.module.scss';
import { APIErrorType, APIMutationContextType } from './Context';
import { Backfill } from '@mana/icons';
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
    code,
    errors,
    message,
    type
  } = error ?? {};

  return (
    <>
      <div className={[
        styles.errorManager,
        styles[position],
      ].filter(Boolean).join(' ')}>
        <Grid
          base
          backgroundColor="blacklo"
          borderColor="red"
          borders
          className={styles.errorContainer}
          padding={12}
          rowGap={12}
          width="max-content"
          templateColumns="auto"
          templateRows="auto auto"
        >
          <Grid
            rowGap={12}
            templateColumns="auto"
            templateRows="auto auto"
          >
            <Text bold monospace>
              {errorRef?.current?.message}
            </Text>

            <Divider />

            {[code, type, message].map((val) => val && (
              <Text key={val} monospace>
                <Ansi>{String(val)}</Ansi>
              </Text>
            ))}

            {[code, type, message]?.some(Boolean) && <Divider short />}

            {error && (
              <pre style={{ whiteSpace: 'break-spaces' }}>
                <Text inline monospace>
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
              <Button Icon={Backfill} basic onClick={dismissError} small>
                Dismiss error
              </Button>

              <Button Icon={Backfill} basic onClick={(event: any) => {
                retry(event);
              }} small>
                Retry request
              </Button>
            </ButtonGroup>
          </Grid>
        </Grid>
      </div>
    </>
  );
});

export default ErrorManager;
