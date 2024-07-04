import React, { useMemo, useRef } from 'react';
import Grid from '@mana/components/Grid';
import MenuManager from '@mana/components/Menu/MenuManager';
import Button from '@mana/elements/Button';
import { AsideType } from '../types';

function Aside({
  Icon,
  baseColorName,
  buttonRef,
  className,
  menuItems,
  onClick,
  uuid,
}: AsideType, ref: React.Ref<HTMLButtonElement>) {
  const element = useMemo(() => {
    const el = (
      <Grid
        alignItems="center"
        backgroundColor={baseColorName ? baseColorName?.toLowerCase() : undefined}
        borders={baseColorName ? false : true}
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
    return (menuItems || onClick)
      ? <Button
        Icon={() => el}
        basic
        className={className}
        containerRef={buttonRef}
        loadingColorName={baseColorName}
        onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
          if (onClick) {
            event.preventDefault();
            onClick && onClick?.(event);
          }
        }}
        wrap
      /> : el;
  }, [
    Icon,
    baseColorName,
    buttonRef,
    className,
    menuItems,
    onClick,
    ref,
  ]);

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
