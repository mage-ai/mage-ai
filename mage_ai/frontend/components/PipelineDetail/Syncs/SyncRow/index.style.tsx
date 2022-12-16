import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { REGULAR } from '@oracle/styles/fonts/sizes';

export const RowStyle = styled.div<{
  danger?: boolean;
  default?: boolean;
  primary?: boolean;
  selected?: boolean;
  success?: boolean;
  warning?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  margin: ${PADDING_UNITS * UNIT}px;
  overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border: 1px solid ${(props.theme.borders || dark.borders).dark};

    &:hover {
      cursor: pointer;
    }
  `}

  ${props => props.selected && props.danger && `
    border-color: ${(props.theme.accent || dark.accent).negative};
  `}

  ${props => props.selected && props.primary && `
    border-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
  `}

  ${props => props.selected && props.default && `
    border-color: ${(props.theme.interactive || dark.interactive).focusBackground};
  `}

  ${props => props.selected && props.success && `
    border-color: ${(props.theme.background || dark.background).success};
  `}

  ${props => props.selected && props.warning && `
    border-color: ${(props.theme.accent || dark.accent).warning};
  `}

  &:hover {
    ${props => props.danger && `
      border-color: ${(props.theme.accent || dark.accent).negative};
    `}

    ${props => props.primary && `
      border-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
    `}

    ${props => props.default && `
      border-color: ${(props.theme.interactive || dark.interactive).focusBackground};
    `}

    ${props => props.success && `
      border-color: ${(props.theme.background || dark.background).success};
    `}

    ${props => props.warning && `
      border-color: ${(props.theme.accent || dark.accent).warning};
    `}
  }
`;

const SHARED_BACKGROUND_STYLE = css<{
  danger?: boolean;
  default?: boolean;
  primary?: boolean;
  success?: boolean;
  warning?: boolean;
}>`
  ${props => props.danger && `
    background-color: ${(props.theme.accent || dark.accent).negative};
  `}

  ${props => props.primary && `
    background-color: ${(props.theme.interactive || dark.interactive).linkPrimary};
  `}

  ${props => props.default && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}

  ${props => props.success && `
    background-color: ${(props.theme.background || dark.background).success};
  `}

  ${props => props.warning && `
    background-color: ${(props.theme.accent || dark.accent).warning};
  `}
`;

export const StatusStyle = styled.div<{
  danger?: boolean;
  default?: boolean;
  primary?: boolean;
  success?: boolean;
  warning?: boolean;
}>`
  ${SHARED_BACKGROUND_STYLE}

  ${REGULAR};
  border-radius: ${BORDER_RADIUS_XXXLARGE}px;
  display: inline-block;
  font-family: ${FONT_FAMILY_REGULAR};
  padding: 6px;

  ${props => props.danger && `
    color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.primary && `
    color: ${(props.theme.content || dark.content).active};
  `}

  ${props => (props.default || props.success) && `
  `}

  ${props => props.default && `
    color: ${(props.theme.content || dark.content).default};
  `}

  ${props => props.success && `
    color: ${(props.theme.content || dark.content).inverted};
  `}

  ${props => props.warning && `
    color: ${(props.theme.content || dark.content).inverted};
  `}
`;

export const BarStyle = styled.div<{
  danger?: boolean;
  default?: boolean;
  primary?: boolean;
  success?: boolean;
  warning?: boolean;
}>`
  ${SHARED_BACKGROUND_STYLE}

  display: flex;
  height: auto;
  width: 3px;

  ${props => props.default && `
    background-color: ${(props.theme.interactive || dark.interactive).focusBackground};
  `}
`;
