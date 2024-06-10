import React from 'react';

import Cell from './Cell';
import Col from './Col';
import Row from './Row';

const GRID_CLASSNAME = 'grid-mana';

type GridProps = {
  className?: string;
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  uuid?: string;
  compact?: boolean;
  section?: boolean;
  pad?: boolean;
  overflowVisible?: boolean;
  height?: 'auto' | 'inherit' | string;
  width?: 'auto' | 'inherit' | string;
  row?: number;
  alignContent?: 'center' | 'start' | 'end' | 'stretch';
  alignItems?: 'center' | 'start' | 'end' | 'stretch';
  autoColumns?: string;
  autoFlow?: 'row' | 'column' | 'row dense' | 'column dense';
  autoRows?: string;
  columnGap?: number;
  justifyContent?: 'center' | 'start' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  justifyItems?: 'center' | 'start' | 'end' | 'stretch';
  rowGap?: number;
  templateColumns?: 'min-content' | 'max-content' | 'auto' | string;
  templateRows?: 'min-content' | 'max-content' | 'auto' | string;
};

function Grid(
  { children, className: classNameProp, uuid, ...props }: GridProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const className = [uuid || GRID_CLASSNAME, classNameProp || ''].join(' ');

  return (
    <div
      {...props}
      className={`${styles.grid} ${className}`}
      ref={ref}
    >
      {children}
    </div>
  );
}

export { Cell, Col, Row };
export default React.forwardRef(Grid);
