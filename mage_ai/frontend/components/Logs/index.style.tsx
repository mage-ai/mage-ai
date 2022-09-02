import styled, { css } from 'styled-components';

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
  exception?: boolean;
  info?: boolean;
  log?: boolean;
  warning?: boolean;
};

export const SHARED_COLOR_STYLES = css<LogLevelIndictorProps>`
  ${props => (props.critical || props.error || props.exception) && `
    background-color: ${RED};
  `}

  ${props => (props.debug || props.warning) && `
    background-color: ${YELLOW};
  `}

  ${props => (props.info || props.log) && `
    background-color: ${BLUE_HIGHLIGHT};
  `}
`;

export const LogLevelIndicatorStyle = styled.div<LogLevelIndictorProps>`
  ${SHARED_COLOR_STYLES}

  border-radius: ${BORDER_RADIUS}px;
  height: 12px;
  width: 5px;
`;
