import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_WIDTH, BORDER_STYLE } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const FileHeaderMenuContainerStyle = styled.div`
  height: 100%;
  width: 100%;
  position: relative;
  padding: ${UNIT / 2}px;

  ${props => `
    border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium};
  `}
`;
