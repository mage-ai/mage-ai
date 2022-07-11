import styled from 'styled-components';

import { SILVER } from '@oracle/styles/colors/main';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { UNIT, PADDING } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  ${props => `
    border: 1px solid ${props.theme.interactive.defaultBorder};
  `}
`;

export const ColumnProfileStyle = styled.div`
  background: ${SILVER};
  ${props => `
    border-bottom: 1px solid ${props.theme.interactive.defaultBorder};
    border-right: 1px solid ${props.theme.interactive.defaultBorder};
  `}
`;

export const HeaderStyle = styled.div`
  background: ${SILVER};
  padding: ${UNIT * 1.75}px ${PADDING}px;
  ${props => `
    border-bottom: 1px solid ${props.theme.interactive.defaultBorder};
  `}
  border-top-left-radius: ${BORDER_RADIUS_LARGE}px;
  border-top-right-radius: ${BORDER_RADIUS_LARGE}px;
`;

export const FeatureProfileStyle = styled.div`
  ${props => `
    border-bottom: 1px solid ${props.theme.interactive.defaultBorder};
  `}
`;

export const BodyStyle = styled.div`
  border-bottom-left-radius: ${BORDER_RADIUS_LARGE}px;
  border-bottom-right-radius: ${BORDER_RADIUS_LARGE}px;
  overflow-y: scroll;
`;

export const CellStyle = styled.div<any>`
  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}
  padding: ${UNIT}px;
`;

export const ScrollOverflowStyle = styled.div`
  overflow-x: scroll;
`;
