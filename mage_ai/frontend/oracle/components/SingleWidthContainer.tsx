import { Col, Row } from 'styled-bootstrap-grid';

import Spacing from '@oracle/elements/Spacing';
import { PADDING_HORIZONTAL_UNITS } from '@oracle/styles/units/spacing';

type SingleWidthContainerProps = {
  children: any;
  width?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
};

function SingleWidthContainer({
  children,
  width = 12,
}: SingleWidthContainerProps) {
  return (
    <Spacing px={PADDING_HORIZONTAL_UNITS}>
      <Row>
        <Col
          lg={width}
          md={Math.min(12, Math.round((12 - width) * 1.5))}
          sm={Math.min(12, Math.round((12 - width) * 1.75))}
          xs={12}
        >
          {children}
        </Col>
      </Row>
    </Spacing>
  );
}

export default SingleWidthContainer;
