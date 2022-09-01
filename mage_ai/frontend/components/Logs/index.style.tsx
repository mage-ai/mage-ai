import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import {
  BLUE_HIGHLIGHT,
  RED,
  YELLOW,
} from '@oracle/styles/colors/main';

type LogLevelIndictorProps = {
  critical?: boolean;
  debug?: boolean;
  error?: boolean;
  info?: boolean;
  log?: boolean;
  warning?: boolean;
};

export const LogLevelIndicatorStyle = styled.div<LogLevelIndictorProps>`
  border-radius: ${BORDER_RADIUS}px;
  height: 12px;
  width: 5px;

  ${props => (props.critical || props.error) && `
    background-color: ${RED};
  `}

  ${props => (props.debug || props.warning) && `
    background-color: ${YELLOW};
  `}

  ${props => (props.info || props.log) && `
    background-color: ${BLUE_HIGHLIGHT};
  `}
`;
