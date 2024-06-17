import React from 'react';
import { Styled } from './index.style';
import { WithStylesProp } from '@mana/hocs/withStyles';

type GridProps = {
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
  overflow?: string;
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
  React.forwardRef(
    (
      props: {
        children?: React.ReactNode | Element | Element[] | React.ReactNode[] | any[] | any;
      } & GridProps,
      ref: React.Ref<any>,
    ) => (
      <Styled ref={ref} {...props}>
        {/* @ts-ignore */}
        {props?.children}
      </Styled>
    ),
  ),
);

export default Grid;
