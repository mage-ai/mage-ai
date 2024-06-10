import React, { forwardRef } from 'react';
import { Col as ColGrid, ColProps as ColGridProps } from 'react-grid-system';
import useWithDisplay, { WithDisplayProps } from '../../../hooks/useWithDisplay';

export const GRID_ROW_COL_CLASS = 'grid-row-col';
export const styles = {
  boxSizing: 'border-box',
  flex: '1 0 0px',
  left: 'auto',
  maxWidth: '100%',
  minHeight: '1px',
  position: 'relative',
  right: 'auto',
  width: '100%',
};

type ColProps = {
  className?: string;
} & ColGridProps &
  WithDisplayProps;

const ColComponent = forwardRef<any, ColProps>(({ children, ...props }, ref) => (
  <ColGrid {...props} ref={ref}>
    {children}
  </ColGrid>
));

const ColWithDisplay = useWithDisplay(ColComponent);
export default ColWithDisplay;
