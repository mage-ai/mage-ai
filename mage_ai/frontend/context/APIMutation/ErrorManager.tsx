import React, { FC, memo } from 'react';

import Button from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import Text from '@oracle/elements/Text';
import styles from '@styles/scss/components/Error/API/ErrorManager.module.scss';
import { APIErrorType, APIMutationContextType } from './Context';
import { Backfill } from '@mana/icons';
import { randomSample } from '@utils/array';

const POSITIONS = [
  'bottom',
  'bottomLeft',
  'bottomRight',
  'center',
  'right',
  'top',
  'topLeft',
  'topRight',
];

type ErrorManagerProps = {
  dismissError: APIMutationContextType['dismissError'];
  errorRef: React.MutableRefObject<APIErrorType>;
};

const ErrorManager: FC<ErrorManagerProps> = memo(function ErrorManager({
  dismissError,
  errorRef,
}: ErrorManagerProps) {
  const position = randomSample(POSITIONS);

  return (
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

          <Divider short />

          <pre style={{ whiteSpace: 'break-spaces' }}>
            <Text inline monospace>
              {JSON.stringify(errorRef?.current?.response?.data?.error ?? '{}', null, 2)}
            </Text>
          </pre>
        </Grid>

        <Divider />

        <Grid templateColumns='min-content'>
          <Button Icon={Backfill} basic onClick={dismissError} small>
            Dismiss error
          </Button>
        </Grid>
      </Grid>
    </div>
  );
});

export default ErrorManager;
