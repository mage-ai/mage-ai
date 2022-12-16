import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { SILVER } from '@oracle/styles/colors/main';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT, PADDING } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS_LARGE}px;
  ${props => `
    border: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}
`;

export const ColumnProfileStyle = styled.div`
  ${props => `
    background: ${(props.theme.background || light.background).table};
    border-bottom: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
    border-right: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}
`;

export const HeaderStyle = styled.div`
  background: ${SILVER};
  padding: ${UNIT * 1.75}px ${PADDING}px;
  ${props => `
    border-bottom: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}
  border-top-left-radius: ${BORDER_RADIUS_LARGE}px;
  border-top-right-radius: ${BORDER_RADIUS_LARGE}px;
`;

export const FeatureProfileStyle = styled.div`
  ${props => `
    border-bottom: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
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
  ${ScrollbarStyledCss}
  overflow-x: auto;
`;
