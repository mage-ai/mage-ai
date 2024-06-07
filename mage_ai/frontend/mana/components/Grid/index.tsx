import React from 'react';

import Cell from './Cell';
import { GridStyled, GridStyledProps } from './index.style';

const GRID_CLASSNAME = 'grid-mana';

type GridProps = {
  children?: React.ReactNode;
} & GridStyledProps;

function Grid({
  children,
  uuid,
  ...props
}: GridProps, ref: React.Ref<HTMLDivElement>) {
  const className = uuid || GRID_CLASSNAME;
  return (
    <GridStyled {...props} className={className} ref={ref} uuid={className}>
      {children}
    </GridStyled>
  );
}

export { Cell };
export default React.forwardRef(Grid);
