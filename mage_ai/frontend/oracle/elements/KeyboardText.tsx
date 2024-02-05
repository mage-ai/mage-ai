import React, { useContext } from 'react';
import styled, { ThemeContext, css } from 'styled-components';

import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';

export type KeyboardTextProps = {
  borderless?: boolean;
  disabled?: boolean;
  inline?: boolean;
  keyText: number | string;
  monospace?: boolean;
  mutedDisabled?: boolean;
  spacingLeft?: number;
};

const SHARED_STYLES = css<{
  borderless?: boolean;
  disabled?: boolean;
  mutedDisabled?: boolean;
  spacingLeft?: number;
}>`
  min-width: 18px;
  padding-left: 2px;
  padding-right: 2px;

  ${props => !props.disabled && `
    background-color: ${(props.theme.content || dark.content).inverted};
  `}

  ${props => props.disabled && `
    // background-color: ${(props.theme.monotone || dark.monotone).grey400} !important;
  `}

  ${props => props.mutedDisabled && `
    opacity: 0.3;
  `}

  ${props => !props.borderless && `
    box-shadow: ${(props.theme.shadow || dark.shadow).small};
    padding-bottom: 3px;
    padding-top: 3px;
  `}

  ${props => props.borderless && `
    border-radius: ${BORDER_RADIUS_SMALL}px;
    padding-bottom: 4px;
    padding-top: 4px;
  `}

  ${props => props.spacingLeft && `
    margin-left: ${props.spacingLeft}px;
  `}
`;

const KbdStyle = styled.kbd`
  ${SHARED_STYLES}
`;

const DivStyle = styled.div`
  ${SHARED_STYLES}
`;

function KeyboardText({
  borderless,
  disabled,
  inline,
  keyText,
  monospace,
  mutedDisabled,
  spacingLeft,
}: KeyboardTextProps) {
  const ElStyle = inline ? DivStyle : KbdStyle;
  const themeContext = useContext(ThemeContext);
  const style: {
    borderColor?: string;
    borderRadius?: number;
    borderStyle?: string;
    borderWidth?: number;
    overflow?: string;
  } = {};
  if (!borderless) {
    if (disabled) {
      // @ts-ignore
      style.borderColor = (themeContext?.monotone || dark.monotone)?.muted;
    } else {
      // @ts-ignore
      style.borderColor = (themeContext || dark)?.monotone?.grey400;
    }
    style.borderRadius = BORDER_RADIUS_SMALL;
    style.borderStyle = 'solid';
    style.borderWidth = 1;
    style.overflow = 'hidden';
  }

  return (
    <Text
      center
      // default={!(disabled || mutedDisabled)}
      inline
      monospace={monospace}
      muted={disabled || mutedDisabled}
      noWrapping
      // @ts-ignore
      style={style}
      xsmall
    >
      <ElStyle
        borderless={borderless}
        disabled={disabled}
        mutedDisabled={mutedDisabled}
        spacingLeft={spacingLeft}
      >
        <div style={{ position: 'relative', top: 1 }}>{keyText}</div>
      </ElStyle>
    </Text>
  );
}

export default KeyboardText;
