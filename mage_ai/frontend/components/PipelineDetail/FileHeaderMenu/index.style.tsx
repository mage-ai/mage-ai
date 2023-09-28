import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

type LinkProps = {
  highlighted?: boolean;
};

export const LinkStyle = styled.div<LinkProps>`
  padding: ${UNIT}px;

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
