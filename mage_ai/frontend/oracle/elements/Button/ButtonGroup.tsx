import React from 'react';
import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';

export type ButtonGroupProps = {
  children: any;
  condensed?: boolean;
  divider?: boolean;
};

const ButtonGroupStyle = styled.div<ButtonGroupProps>``;

const VerticalDivider = styled.div`
  width: 1px;
`;

const ButtonGroup = ({
  children,
  divider,
}: ButtonGroupProps) => {
  const numberOfButtons: number = children.length;

  return (
    <ButtonGroupStyle>
      <FlexContainer>
        {React.Children.map(children, (child, idx) => child && (
          <Flex key={`button-group-child-${idx}`}>
            {idx >= 1 && divider && <VerticalDivider />}

            {React.cloneElement(child, {
              borderRadiusLeft: idx === 0,
              borderRadiusRight: idx === numberOfButtons - 1,
              halfPaddingLeft: idx !== 0,
              halfPaddingRight: idx !== numberOfButtons - 1,
              noBorder: idx > 0 && idx < numberOfButtons - 1,
              noBorderRight: idx !== numberOfButtons - 1,
            })}
          </Flex>
        ))}
      </FlexContainer>
    </ButtonGroupStyle>
  );
};

export default ButtonGroup;
