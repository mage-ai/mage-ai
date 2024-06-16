import React from 'react';
import { Styled } from './index.style';
import { WithStylesProp } from '@mana/hocs/withStyles';

type GridProps = {
  alignContent?: string;
  alignItems?: string;
  area?: string;
  autoColumns?: string;
  autoFlow?: string;
  autoRows?: string;
  column?: string;
  columnEnd?: string;
  columnGap?: string;
  columnStart?: string;
  height?: string;
  justifyContent?: string;
  justifyItems?: string;
  placeContent?: string;
  placeItems?: string;
  row?: string;
  rowEnd?: string;
  rowGap?: string;
  rowStart?: string;
  templateAreas?: string;
  templateColumns?: string;
  templateRows?: string;
  uuid?: string;
  width?: string;
} & WithStylesProp;

const Grid: React.FC<GridProps> = React.memo((props: GridProps) => (
  <Styled {...props}>
    {props.children}
  </Styled>
));

export default Grid;
