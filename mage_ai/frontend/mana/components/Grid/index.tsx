import React from 'react';
import { Styled } from './index.style';
import { WithStylesProp } from '@mana/hocs/withStyles';

type GridProps = {
  borders?: boolean;
  children?: React.ReactNode | Element | Element[] | React.ReactNode[] | any | any[];
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
  padding?: number | string;
  paddingTop?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  paddingRight?: number | string;
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

function Grid({ children, ...props }: GridProps, ref: React.Ref<any>) {
  return (
    <Styled ref={ref} {...props}>
      {children && (children as React.ReactNode)}
    </Styled>
  );
}

export default React.forwardRef(Grid);
