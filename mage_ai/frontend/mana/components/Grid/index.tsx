import React from 'react';
import { Styled } from './index.style';
import { WithStylesProp } from '@mana/hocs/withStyles';

type GridProps = {
  children?: React.ReactNode | Element | Element[] | React.ReactNode[] | any | any[];
  id?: string;
  uuid?: string;
} & WithStylesProp;

function Grid({ children, id, ...props }: GridProps, ref: React.Ref<any>) {
  return (
    <Styled ref={ref} {...props} id={id}>
      {children && (children as React.ReactNode)}
    </Styled>
  );
}

export default React.forwardRef(Grid);
