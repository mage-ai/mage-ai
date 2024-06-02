import { Container } from 'react-grid-system'; // https://sealninja.github.io/react-grid-system
import Col from './Col';
import Row from './Row';

function Grid({ children }: { children: React.ReactNode }) {
  return <Container fluid>{children}</Container>;
}

export { Col, Row };
export default Grid;
