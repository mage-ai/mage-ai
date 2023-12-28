import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type LinkProps = {
  highlighted?: boolean;
};

export const LinkStyle = styled.div<LinkProps>`
  padding: ${UNIT * 0.5}px ${1.5 * UNIT}px;

  &:hover {
    cursor: pointer;

    ${props => `
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    `}
  }

  ${props => props.highlighted && `
    background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
  `}
`;
