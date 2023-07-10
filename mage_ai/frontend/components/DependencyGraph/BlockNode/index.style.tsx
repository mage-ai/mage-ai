import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const NodeStyle = styled.div<{
  borderColor?: string;
  height?: number;
}>`
  border-radius: ${BORDER_RADIUS}px;
  border: 1px solid transparent;
  min-width: fit-content;
  overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}
`;

export const IconStyle = styled.div<{
  backgroundColor?: string;
  borderColor?: string;
}>`
  align-items: center;
  border-radius: ${BORDER_RADIUS_SMALL}px;
  border: 2px solid transparent;
  display: flex;
  height: ${UNIT * 5}px;
  justify-content: center;
  width: ${UNIT * 5}px;

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
    border-color: ${props.backgroundColor};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
  `}
`;

export const HeaderStyle = styled.div`
  padding: ${UNIT * 1}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).dashboard};
  `}
`;

export const BodyStyle = styled.div`
  padding-left: ${UNIT * 1}px;
  padding-right: ${UNIT * 1}px;
`;

export const BadgeStyle = styled.div`
  margin: ${UNIT * 0.5}px;
`;
