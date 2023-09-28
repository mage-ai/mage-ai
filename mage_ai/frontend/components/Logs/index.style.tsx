import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import {
  BLUE_HIGHLIGHT,
  GRAY_LINES,
  RED,
  RED_LIGHT,
  PINK,
  YELLOW,
  YELLOW_LIGHT,
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

function getColor({
  critical,
  debug,
  error,
  exception,
  info,
  log,
  warning,
}: LogLevelIndictorProps) {
  if (critical) {
    return RED_LIGHT;
  } else if (debug) {
    return YELLOW_LIGHT;
  } else if (error) {
    return PINK;
  } else if (exception) {
    return RED;
  } else if (info) {
    return BLUE_HIGHLIGHT;
  } else if (log) {
    return GRAY_LINES;
  } else if (warning) {
    return YELLOW;
  }

  return 'transparent';
}

export const SHARED_COLOR_STYLES = css<LogLevelIndictorProps>`
  ${props => `
    background-color: ${getColor(props)};
  `}
`;

export const LogLevelIndicatorStyle = styled.div<LogLevelIndictorProps>`
  ${SHARED_COLOR_STYLES}

  border-radius: ${BORDER_RADIUS}px;
  height: 12px;
  width: 5px;
`;
