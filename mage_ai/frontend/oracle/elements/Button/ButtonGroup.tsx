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
  const numberOfButtons = React.Children.toArray(children).length;

  return (
    <ButtonGroupStyle>
      <FlexContainer>
        {React.Children.map(children, (child, idx) => child && (
          <Flex key={`button-group-child-${idx}`}>
            {idx >= 1 && divider && <VerticalDivider />}

            {React.cloneElement(child, {
              borderRadiusLeft: numberOfButtons >= 2 && idx === 0,
              borderRadiusRight: numberOfButtons >= 2 && idx === numberOfButtons - 1,
              halfPaddingLeft: numberOfButtons >= 2 && idx !== 0,
              halfPaddingRight: numberOfButtons >= 2 && idx !== numberOfButtons - 1,
              noBorder: numberOfButtons >= 2 && idx > 0 && idx < numberOfButtons - 1,
              noBorderRight: numberOfButtons >= 2 && idx !== numberOfButtons - 1,
            })}
          </Flex>
        ))}
      </FlexContainer>
    </ButtonGroupStyle>
  );
};

export default ButtonGroup;
