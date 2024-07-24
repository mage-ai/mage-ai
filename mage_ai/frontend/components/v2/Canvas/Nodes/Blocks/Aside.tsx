import React, { useMemo, useRef } from 'react';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import Grid from '@mana/components/Grid';
import MenuManager from '@mana/components/Menu/MenuManager';
import Button from '@mana/elements/Button';
import { AsideType } from '../types';

function Aside(
  { Icon, baseColorName, className, menuItems, loading, borderColor, onClick, uuid }: AsideType,
  ref: React.Ref<HTMLButtonElement>,
) {
  const element = useMemo(() => {
    const el = (
      <Grid
        alignItems="center"
        backgroundColor={
          borderColor ? undefined : baseColorName ? baseColorName?.toLowerCase() : undefined
        }
        borderColor={borderColor}
        borders={borderColor ? true : baseColorName ? false : true}
        bordersTransparent={baseColorName ? true : false}
        justifyContent="center"
        ref={ref}
        style={{
          height: 32,
          width: 32,
        }}
      >
        {Icon ? <Icon inverted={baseColorName === 'green'} size={14} /> : null}
      </Grid>
    );
    return menuItems || onClick ? (
      <Button
        Icon={() => el}
        basic
        className={className}
        loading={loading}
        loadingColorName={baseColorName}
        onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
          if (onClick) {
            event.preventDefault();
            onClick && onClick?.(event);
          }
        }}
        wrap
      />
    ) : (
      el
    );
  }, [Icon, baseColorName, borderColor, className, loading, menuItems, onClick, ref]);

  return (
    <MenuManager
      items={menuItems}
      uuid={uuid}
    >
      {element}
    </MenuManager>
  );
}

export default React.forwardRef(Aside);
