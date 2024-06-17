import Grid from '@mana/components/Grid';

import { AsideType } from '../types';

export default function Aside({ Icon, baseColorName }: AsideType) {
  return (
    <Grid
      alignItems="center"
      backgroundColor={baseColorName?.toLowerCase()}
      bordersTransparent
      justifyContent="center"
      style={{
        height: 32,
        width: 32,
      }}
    >
      <Icon
        inverted={baseColorName === 'green'}
        size={14}
      />
    </Grid>
  );
}
