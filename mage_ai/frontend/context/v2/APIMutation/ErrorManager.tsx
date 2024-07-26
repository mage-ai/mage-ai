import Ansi from 'ansi-to-react';
import React, { FC, memo, useRef, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import styles from '@styles/scss/components/Error/API/ErrorManager.module.scss';
import { APIErrorType, APIMutationContextType } from './Context';
import { AISparkle, AlertTriangle, Insights, Monitor } from '@mana/icons';
import { randomSample } from '@utils/array';

const POSITIONS = ['bottomLeft', 'bottomRight', 'right', 'topLeft', 'topRight'];

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
  const { error } = errorRef?.current?.response?.data ?? {};
  const { error: clientError } = errorRef?.current?.client ?? {};

  const code = error?.code;
  const errors = error?.errors ?? clientError?.errors;
  const message = error?.message ?? clientError?.message;
  const type = error?.type ?? clientError?.type;

  return (
    <motion.div
      className={[
        styles.errorManager,
        // styles[position],
        // styles.bottomLeft,
      ].filter(Boolean).join(' ')}
      drag
      dragMomentum={false}
      dragPropagation={false}
      onPointerDown={event => {
        event.stopPropagation();
      }}
    >
      <Grid
        borderColor="redmd"
        borders
        className={styles.errorContainer}
        rowGap={12}
        style={{
          borderWidth: 2,
          padding: 24,
        }}
        templateColumns="auto"
        templateRows="auto auto"
        width="max-content"
      >
        <Grid rowGap={12} templateColumns="auto" templateRows="auto auto">
          <AlertTriangle colorName="yellow" />

          {errorRef?.current?.message && (
            <Text monospace secondary semibold small>
              <Ansi>{errorRef?.current?.message}</Ansi>
            </Text>
          )}

          {[code, type, message, errors?.length >= 1]?.some(Boolean) && <Divider />}

          {[code, type, message].map(
            val =>
              val && (
                <Text key={val} monospace small>
                  <Ansi>{String(val)}</Ansi>
                </Text>
              ),
          )}

          {[errors?.length > 0]?.some(Boolean) && <Divider short />}

          {errors?.length >= 1 && clientError && (
            <Text monospace small>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                }}
              >
                <Ansi>{errors?.join('\n')}</Ansi>
              </pre>
            </Text>
          )}

          {errors?.length >= 1 && !clientError && (
            <pre
              style={{
                whiteSpace: 'break-spaces',
              }}
            >
              <Text inline monospace small>
                {errors?.map((line: string) => <Ansi key={line}>{line}</Ansi>)}
              </Text>
            </pre>
          )}
        </Grid>

        <Divider />

        <Grid autoFlow="column" justifyContent="space-between" templateColumns="min-content">
          <ButtonGroup>
            <Button basic onClick={dismissError} small>
              Dismiss error
            </Button>

            {false && (
              <Button
                basic
                onClick={(event: any) => {
                  retry(event);
                }}
                small
              >
                Retry request
              </Button>
            )}
          </ButtonGroup>

          <ButtonGroup>
            <Button Icon={Monitor} basic disabled small>
              Fix error
            </Button>

            <Button Icon={Insights} basic disabled small>
              Explain error
            </Button>
          </ButtonGroup>
        </Grid>
      </Grid>
    </motion.div>
  );
});

export default ErrorManager;
