import React from 'react';
import { Styled } from './index.style';
import { WithStylesProp } from '@mana/hocs/withStyles';

type GridProps = {
  base?: boolean;
  baseLeft?: boolean;
  baseRight?: boolean;
  bordersBottom?: boolean;
  children?: React.ReactNode | Element | Element[] | React.ReactNode[] | any | any[];
  onContextMenu?: (event: any) => void;
  id?: string;
  smallBottom?: boolean;
  smallTop?: boolean;
  uuid?: string;
} & WithStylesProp;

function Grid({ children, id, onContextMenu, ...props }: GridProps, ref: React.Ref<any>) {
  return (
    <Styled ref={ref} {...props} id={id} onContextMenu={onContextMenu}>
      {children && (children as React.ReactNode)}
    </Styled>
  );
}

export default React.forwardRef(Grid);
