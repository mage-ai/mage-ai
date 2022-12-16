import React from 'react';
import styled, { css } from 'styled-components';

import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import TooltipWrapper, { TooltipWrapperProps } from './TooltipWrapper';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { Info } from '@oracle/icons';
import { UNIT, WIDTH_OF_SINGLE_CHARACTER } from '@oracle/styles/units/spacing';

export type TooltipProps = {
  keyboardShortcuts?: any[];
  inverted?: boolean;
  primary?: boolean;
} & TooltipWrapperProps;

const MAX_WIDTH = UNIT * 42;

const SHARED_STYLES = css<{
  width?: number;
} & TooltipProps>`
  border-radius: ${BORDER_RADIUS_SMALL}px;

  ${props => `
    box-shadow: ${(props.theme.shadow || dark.shadow).popup};
    background-color: ${(props.theme.background || dark.background).popup};
  `}

  ${props => props.lightBackground && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}

  ${props => props.width && !(props.widthFitContent || props.autoWidth) && `
    width: ${props.width}px;
  `}

  ${props => !props.width && !(props.widthFitContent || props.autoWidth) && `
    width: ${MAX_WIDTH}px;
  `}
`;

const LabelStyle = styled.div`
  ${SHARED_STYLES}

  padding: ${UNIT * 0.75}px ${UNIT * 1}px;
`;

const DescriptionStyle = styled.div`
  ${SHARED_STYLES}

  padding: ${UNIT * 1.5}px ${UNIT * 2}px;
`;

function Tooltip({
  autoWidth,
  children,
  default: defaultProp,
  description,
  inverted,
  keyboardShortcuts,
  label,
  lightBackground,
  maxWidth,
  muted,
  primary,
  size = UNIT * 2,
  warning,
  widthFitContent,
  ...props
}: TooltipProps) {
  const text = description || label || '';
  const TextEl = description ? DescriptionStyle : LabelStyle;
  const minWidth = Math.min(maxWidth || MAX_WIDTH, text.length * WIDTH_OF_SINGLE_CHARACTER);

  const keyboardShortcutsEls = [];
  keyboardShortcuts?.forEach((el: any, idx: number) => {
    if (idx >= 1) {
      keyboardShortcutsEls.push(
        <Text default>
          +
        </Text>,
      );
    }
    keyboardShortcutsEls.push(el);
  });
  const keyboardShortcutsElsFinal = keyboardShortcutsEls.map((el, idx) => {
    const key = `keyboard-shortcut-${idx}`;

    return typeof el === 'string'
      ? <span key={key}>{el}</span>
      : React.cloneElement(el, { key });
  });

  return (
    <TooltipWrapper
      {...props}
      autoWidth={autoWidth}
      content={
        <TextEl
          autoWidth={autoWidth}
          lightBackground={lightBackground}
          width={maxWidth}
          widthFitContent={widthFitContent}
        >
          <FlexContainer alignItems="center">
            <Text whiteSpaceNormal>{text}</Text>
            {keyboardShortcutsElsFinal.length >= 1 && (
              <Text muted>
                &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
              </Text>
            )}
            {keyboardShortcutsElsFinal.length >= 1 && keyboardShortcutsElsFinal}
          </FlexContainer>
        </TextEl>
      }
      lightBackground={lightBackground}
      minWidth={minWidth}
      noHoverOutline={!!children}
      size={size}
      widthFitContent={widthFitContent}
    >
      {children || (
        <Info
          default={defaultProp}
          inverted={inverted}
          muted={muted}
          primary={primary}
          size={size}
          warning={warning}
        />
      )}
    </TooltipWrapper>
  );
}

export default Tooltip;
