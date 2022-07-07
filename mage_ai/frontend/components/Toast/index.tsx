import React from 'react';
import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export type ToastProps = {
  action?: any;
  beforeIcon?: any;
  children?: any;
  message?: string;
};

const ToastStyle = styled.div<ToastProps>`
  border-radius: ${BORDER_RADIUS}px;
  bottom: ${UNIT * 3}px;
  box-shadow: rgba(0, 0, 0, 0.25) 0px 2px 12px 0px;
  max-width: ${UNIT * 50}px;
  position: fixed;
  right: ${UNIT * 3}px;
  width: 100%;
  z-index: 40;

  ${props => `
    background-color: ${(props.theme.background || dark.background).dialog};
    color: ${(props.theme.content || dark.content).active};
  `}
`;

const Toast = ({
  action,
  beforeIcon,
  children,
  message,
  ...props
}: ToastProps) => (
  <ToastStyle
    {...props}
  >
    <Spacing p={2}>
      <FlexContainer alignItems="center">
        {beforeIcon && (
          <Spacing mr={2}>
            <Flex>
              {beforeIcon}
            </Flex>
          </Spacing>
        )}
        <Flex flex="1">
          {children && !message && children}
          {message && !children && (
            <Text weightStyle={4}>{message}</Text>
          )}
        </Flex>
        {action && (
          <Spacing ml={2}>
            <Flex>
              {action}
            </Flex>
          </Spacing>
        )}
      </FlexContainer>
    </Spacing>
  </ToastStyle>
);

export default Toast;
