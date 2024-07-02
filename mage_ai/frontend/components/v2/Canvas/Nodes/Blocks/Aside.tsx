import React from 'react';
import Grid from '@mana/components/Grid';
import Button from '@mana/elements/Button';

import { AsideType } from '../types';

function Aside({ Icon, baseColorName, buttonRef, className, onClick }: AsideType) {
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
      basic
      className={className}
      containerRef={buttonRef}
      loadingColorName={baseColorName}
      onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.preventDefault();
        onClick(event);
      }}
      wrap
    />
  ) : (
    el
  );
}

export default React.forwardRef(Aside);
