import React, { forwardRef } from 'react';
import { Row as RowGrid, RowProps as RowGridProps } from 'react-grid-system';
import useWithDisplay, { WithDisplayProps } from '../../../hooks/useWithDisplay';

type RowProps = RowGridProps & WithDisplayProps;

const RowComponent = forwardRef<any, RowProps>(({ children, ...props }, ref) => (
  <RowGrid {...props} ref={ref}>
    {children}
  </RowGrid>
));

const RowWithDisplay = useWithDisplay(RowComponent);

export default RowWithDisplay;
