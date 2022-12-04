import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { REGULAR } from '@oracle/styles/fonts/sizes';

export const RowStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${3 * UNIT}px;
  margin: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border: 1px solid ${(props.theme.borders || dark.borders).dark};
  `}
`;

export const StatusStyle = styled.div`
  ${REGULAR};
  border-radius: ${BORDER_RADIUS_XXXLARGE}px;
  display: inline-block;
  font-family: ${FONT_FAMILY_REGULAR};
  padding: 6px;

  ${props => props.danger && `
    background-color: ${(props.theme.accent || dark.accent).negative};
    color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.primary && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    color: ${(props.theme.content || dark.content).active};
  `}

  ${props => (props.default || props.success) && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}

  ${props => props.default && `
    color: ${(props.theme.content || dark.content).default};
  `}

  ${props => props.success && `
    color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.warning && `
    background-color: ${(props.theme.accent || dark.accent).warning};
    color: ${(props.theme.content || dark.content).inverted};
  `}
`;
