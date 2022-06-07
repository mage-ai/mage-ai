import styled from 'styled-components';

import light from '@oracle/styles/themes/light';

export const ColumnRowStyle = styled.div<{
  selected: boolean;
}>`
  ${props => !props.selected && `
    border-bottom: 1px solid ${(props.theme.monotone || light.monotone).grey200};

    &:hover {
      background-color: ${(props.theme.accent || light.accent).cyanTransparent};
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.accent || light.accent).cyanTransparent};
    border-bottom: 1px solid ${(props.theme.accent || light.accent).cyan};
  `}
`;
