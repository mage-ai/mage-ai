import React from 'react';

import { Row, Col } from '../../components/Container';
import { UNIT } from '@mana/themes/spaces';

function Group({ children }: { children: React.ReactNode }) {
  return (
    <Row gutterWidth={UNIT * 2} verticalGutter>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return (
            <Col key={`${child.props.uuid || 'col'}-${index}`} xs="content">
              {child}
            </Col>
          );
        }
        return null;
      })}
    </Row>
  );
}

export default Group;
