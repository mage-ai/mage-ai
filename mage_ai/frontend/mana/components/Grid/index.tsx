import React from 'react';

import Cell from './Cell';
import Col from './Col';
import Row from './Row';
import { GridStyled, GridStyledProps } from './index.style';

const GRID_CLASSNAME = 'grid-mana';

type GridProps = {
  className?: string;
  children?: React.ReactNode;
  onClick?: (event: Event) => void;
} & GridStyledProps;

function Grid(
  { children, className: classNameProp, uuid, ...props }: GridProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const className = [uuid || GRID_CLASSNAME, classNameProp || ''].join(' ');

  return (
    <GridStyled {...props} className={className} ref={ref} uuid={uuid}>
      {children}
    </GridStyled>
  );
}

export { Cell, Col, Row };
export default React.forwardRef(Grid);
