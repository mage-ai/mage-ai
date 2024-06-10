import React from 'react';

// https://sealninja.github.io/react-grid-system
import Col from './Col';
import Row from './Row';
import { Container as ContainerGrid } from 'react-grid-system';

function Container({ children }: { children: React.ReactNode }, ref) {
  return <ContainerGrid fluid>{children}</ContainerGrid>;
}

export { Col, Row };
export default React.forwardRef(Container);
