import type { CSSProperties, FC } from 'react';
import { memo } from 'react';

import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';

const styles: CSSProperties = {
  border: '1px dashed gray',
  cursor: 'move',
  height: 100,
  padding: 0,
  width: 200,
};

export interface BoxProps {
  preview?: boolean
  title: string
  yellow?: boolean
}

const BlockNode: FC<BoxProps> = memo(function Box({ title, yellow, preview }) {
  const backgroundColor = yellow ? 'yellow' : 'white';
  return (
    <Grid
      alignItems="center"
      role={preview ? 'BoxPreview' : 'Box'}
      style={{ ...styles, backgroundColor }}
    >
      <Text monospace small>
        {title}
      </Text>
    </Grid>
  );
});

export default BlockNode;
