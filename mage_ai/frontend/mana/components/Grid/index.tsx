import React from 'react';
import { Styled } from './index.style';
import { WithStylesProp } from '@mana/hocs/withStyles';

type GridProps = {
  base?: boolean;
  baseLeft?: boolean;
  baseRight?: boolean;
  bordersBottom?: boolean;
  children?: React.ReactNode | Element | Element[] | React.ReactNode[] | any | any[];
  id?: string;
  smallBottom?: boolean;
  smallTop?: boolean;
  uuid?: string;
} & WithStylesProp;

function Grid({ children, id, onContextMenu, ...props }: GridProps, ref: React.Ref<any>) {
  return (
    <div onContextMenu={onContextMenu}>
      <Styled ref={ref} {...props} id={id}>
        {children && (children as React.ReactNode)}
      </Styled >
    </div>
  );
}

export default React.forwardRef(Grid);
