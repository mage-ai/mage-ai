import React, { useMemo, useRef, useState } from 'react';
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
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

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
          event.preventDefault();
          onClick && onClick?.(event);
          menuItems && setOpen(prev => !prev);
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
      // contained
      items={menuItems}
      open={open}
      uuid={uuid}
    >
      {element}
    </MenuManager>
  );
}

export default React.forwardRef(Aside);
