import React from 'react';
import { Styled } from './index.style';
import { WithStylesProp } from '@mana/hocs/withStyles';

type GridProps = {
  children?: React.ReactNode | Element | Element[] | React.ReactNode[];
  borders?: boolean;
  alignContent?: string;
  alignItems?: string;
  area?: string;
  autoColumns?: string;
  autoFlow?: string;
  autoRows?: string;
  column?: number;
  columnEnd?: number;
  columnGap?: number;
  columnStart?: number;
  height?: number | string;
  justifyContent?: string;
  justifyItems?: string;
  placeContent?: string;
  placeItems?: string;
  row?: number;
  rowEnd?: number;
  rowGap?: number;
  rowStart?: number;
  templateAreas?: string;
  templateColumns?: string;
  templateRows?: string;
  uuid?: string;
  width?: number | string;
} & WithStylesProp;

const Grid: React.FC<
  GridProps & {
    ref?: React.Ref<any>;
  }
> = React.memo(
  React.forwardRef(({ children, ...props }: GridProps, ref: React.Ref<any>) => (
    <Styled ref={ref} {...props}>
      {children}
    </Styled>
  )),
);

export default Grid;
