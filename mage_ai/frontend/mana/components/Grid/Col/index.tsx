import React, { forwardRef } from 'react';
import { Col as ColGrid, ColProps as ColGridProps } from 'react-grid-system';
import useWithDisplay, { WithDisplayProps } from '../../../hooks/useWithDisplay';

type ColProps = ColGridProps & WithDisplayProps;

const ColComponent = forwardRef<any, ColProps>(({ children, ...props }, ref) => (
  <ColGrid {...props} ref={ref}>
    {children}
  </ColGrid>
));

const ColWithDisplay = useWithDisplay(ColComponent);

export default ColWithDisplay;
