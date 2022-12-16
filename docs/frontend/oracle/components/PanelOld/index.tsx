import React from 'react';
import styled from 'styled-components';
import { Col, Row } from 'styled-bootstrap-grid';

import PanelRoot from './PanelRoot';
import { UNIT } from '@oracle/styles/units/spacing';

type PanelProps = {
  borderColor?: string;
  condensed?: boolean;
  containedWidth?: boolean;
  fullWidth?: boolean;
  minHeight?: number;
  maxWidth?: number;
  section?: boolean;
  shadow?: boolean;
  shadowLarge?: boolean;
  shadowLight?: boolean;
  transparent?: boolean;
};

const ContainedWidthStyle = styled.div`
  width: 100%;
`;

const FullWidthStyle = styled.div`
  width: ${UNIT * 62}px;
`;

function Panel({
  children,
  condensed = false,
  containedWidth = false,
  fullWidth = true,
  minHeight,
  ...props
}: {
  children: any,
} & PanelProps, ref) {
  const el = (
    <PanelRoot
      {...props}
      condensed={condensed}
      minHeight={minHeight}
    >
      {children}
    </PanelRoot>
  );

  return (
    containedWidth
      ?
        <ContainedWidthStyle ref={ref}>
          {el}
        </ContainedWidthStyle>
      :
        <Row ref={ref}>
          <Col xs={12} hiddenMdUp={fullWidth}>
            <ContainedWidthStyle>
              {el}
            </ContainedWidthStyle>
          </Col>

          {fullWidth &&
            <Col xs={12} hiddenMdDown>
              <FullWidthStyle>
                {el}
              </FullWidthStyle>
            </Col>
          }
        </Row>
  );
}

export default React.forwardRef(Panel);
