import Grid from '@mana/components/Grid';
import Button from '@mana/elements/Button';

import { AsideType } from '../types';

export default function Aside({ Icon, baseColorName, className, onClick }: AsideType) {
  const icon = Icon ? <Icon inverted={baseColorName === 'green'} size={14} /> : null;
  const el = (
    <Grid
      alignItems="center"
      backgroundColor={baseColorName ? baseColorName?.toLowerCase() : undefined}
      borders={baseColorName ? false : true}
      bordersTransparent={baseColorName ? true : false}
      justifyContent="center"
      style={{
        height: 32,
        width: 32,
      }}
    >
      {icon}
    </Grid>
  );

  return onClick ? (
    <Button
      Icon={() => el}
      asLink
      basic
      className={className}
      onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.preventDefault();
        onClick(event);
      }}
    />
  ) : (
    el
  );
}
