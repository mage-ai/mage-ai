import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ROW_HEIGHT = 2 * UNIT;

export const ContainerStyle = styled.div`
  height: 100%;
  min-height: ${100 * UNIT}px;
  overflow: auto;
  position: fixed;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => !props.width && `
    width: 100%;
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}
`;

export const InnerStyle = styled.div`
  padding-bottom: ${40 * UNIT}px;
`;

export const InputStyle = styled.div`
  height: ${ROW_HEIGHT}px;
`;
