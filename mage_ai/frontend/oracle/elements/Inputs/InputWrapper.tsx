import React, { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { CSSTransition } from 'react-transition-group';

import Text from '../Text';
import light from '@oracle/styles/themes/light'
import { BORDER_RADIUS } from '../../styles/units/borders';
import {
  BORDER_STYLE,
  BORDER_WIDTH,
} from '../../styles/units/borders';
import {
  FONT_FAMILY_BOLD,
  FONT_FAMILY_MEDIUM,
  MONO_FONT_FAMILY_REGULAR,
} from '../../styles/fonts/primary';
import {
  REGULAR,
  SMALL,
} from '../../styles/fonts/sizes';
import { UNIT } from '../../styles/units/spacing';
import { browser, transition } from '../../styles/mixins';

export type MetaType = {
  error?: string;
  touched?: boolean;
};

export type InputWrapperProps = {
  afterIcon?: any;
  afterIconClick?: () => void;
  alignCenter?: boolean;
  autoComplete?: string;
  basic?: boolean;
  basicPadding?: boolean;
  beforeIcon?: any;
  bold?: boolean;
  danger?: boolean;
  defaultColor?: boolean;
  disabled?: boolean;
  disablePointerEvents?: boolean;
  fullWidth?: boolean;
  holder?: string;
  info?: boolean;
  inputWidth?: number;
  isFocused?: boolean;
  label?: any;
  labelDescription?: any;
  labelFixed?: string;
  large?: boolean;
  maxHeight?: number;
  meta?: MetaType;
  minWidth?: number;
  monospace?: boolean;
  name?: string;
  noBackground?: boolean;
  noBlinkingCursor?: boolean;
  noBorder?: boolean;
  noBorderRadiusBottom?: boolean;
  noBorderUntilFocus?: boolean;
  noBorderUntilHover?: boolean;
  onBlur?: (e: any) => void;
  onChange?: (e: any) => void;
  onFocus?: (e: any) => void;
  onKeyDown?: (e: any) => void;
  onKeyPress?: (e: any) => void;
  paddingHorizontal?: number;
  paddingVertical?: number;
  placeholder?: string;
  primary?: boolean;
  readOnly?: boolean;
  required?: boolean;
  setContentOnMount?: boolean;
  shadow?: boolean;
  showLabelRequirement?: (opts: any) => boolean;
  small?: boolean;
  spellCheck?: boolean;
  topPosition?: boolean;
  type?: string;
  value?: string;
  visible?: boolean;
  warning?: boolean;
  width?: number;
};

type InputWrapperInternalProps = {
  input: any;
};

type IconContainerProps = {
  compact?: boolean;
  divider?: boolean;
  right?: boolean;
  top?: boolean;
};

const ContainerStyle = styled.div<Partial<InputWrapperProps>>`
  .label-enter {
    opacity: 0;
    transform: translate(0, ${UNIT}px);
  }
  .label-enter-active {
    opacity: 1;
    transform: translate(0, 0);
    transition: all 200ms;
  }
  .label-exit {
    opacity: 1;
    transform: translate(0, 0);
  }
  .label-exit-active {
    opacity: 0;
    transform: translate(0, 13px);
    transition: all 100ms;
  }

  ${props => props.visible && `
    position: relative;
  `}

  ${props => !props.visible && `
    opacity: 0;
    position: absolute;
    z-index: 0;
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

const LabelContainerStyle = styled.div<Partial<InputWrapperProps>>`
  position: absolute;

  ${props => !props.beforeIcon && `
    left: ${UNIT * 2}px;
    top: ${UNIT * 0.75}px;
  `}

  ${props => props.beforeIcon && `
    left: ${UNIT * 5}px;
    top: ${UNIT * 0.5}px;
  `}
`;

const IconContainerStyle = styled.div<IconContainerProps>`
  position: absolute;
  
  top: ${({ top }) => top ? 0 : BORDER_WIDTH}px;

  ${props => !props.compact && `
    padding: ${UNIT}px;
  `}

  ${props => props.compact && `
    padding: ${UNIT * 0.75}px;
  `}

  ${props => props.right && `
    right: 0;
  `}

  ${props => props.divider && `
    border-right: 1px solid ${(props.theme.interactive || light.interactive).defaultBorder};
  `}
`;

export const SHARED_INPUT_STYLES = css<InputWrapperProps>`
  padding: ${UNIT * 0.75}px ${UNIT * 1.25}px;

  ${browser('appearance', 'none')}
  ${browser('transition', 'background 300ms ease 0s, border 300ms ease 0s, color 300ms ease 0s')}
  ${transition('200ms box-shadow linear')}

  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  background-color: transparent;
  box-sizing: border-box;
  outline-style: none;

  ${props => !props.small && !props.large && `
    ${REGULAR}
  `}

  ${props => props.small && `
    ${SMALL}
    line-height: 20px !important;
  `}

  ${props => !props.monospace && `
    font-family: ${FONT_FAMILY_MEDIUM};
  `}

  ${props => props.monospace && `
    font-family: ${MONO_FONT_FAMILY_REGULAR};
  `}

  ${props => props.bold && `
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => !props.noBorder && `
    border-radius: ${BORDER_RADIUS}px;
    border-style: ${BORDER_STYLE};
    border-width: ${BORDER_WIDTH}px};
  `}

  ${props => props.noBorderRadiusBottom && `
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  `}

  ${props => props.noBorder && `
    border-style: none;
  `}

  ${props => props.noBorderUntilFocus && `
    border-style: none;

    &:focus {
      border-style: ${BORDER_STYLE};
    }
  `}

  ${props => props.noBorderUntilHover && `
    border-style: none;

    &:hover {
      border-style: ${BORDER_STYLE};
    }
  `}

  

  ${props => !props.disabled && !props.noBackground && `
    border-color: ${(props.theme.interactive || light.interactive).defaultBorder};

    &:hover {
      background-color: ${(props.theme.interactive || light.interactive).hoverBackground};
      border-color: ${(props.theme.interactive || light.interactive).hoverBorder};
    }

    &:focus {
      border-color: ${(props.theme.interactive || light.interactive).focusBorder};
    }
  `}

  ${props => props.noBlinkingCursor && `
    &:focus {
      text-indent: -9999em;
      text-shadow : 9999em 0 0 #000;
    }
  `}

  ${props => props.shadow && `
    &:focus {
      box-shadow:
        0 0 0 1px ${(props.theme.interactive || light.interactive).focusBorder} inset,
        0 0 0 1px ${(props.theme.interactive || light.interactive).focusBorder}
      ;
    }
  `}

  ${props => props.disabled && `
    border-color: ${(props.theme.interactive || light.interactive).disabledBorder};
    color: ${(props.theme.content || light.content).disabled};

    ::placeholder {
      color: ${(props.theme.content || light.content).disabled};
    }
  `}

  ${props => props.danger && `
    border-color: ${(props.theme.interactive || light.interactive).dangerBorder};
  `}

  ${props => props.beforeIcon && `
    padding-left: ${UNIT * 4}px !important;
  `}

  ${props => props.afterIcon && `
    padding-right: ${UNIT * 4}px !important;
  `}

  ${props => !props.inputWidth && !props.minWidth && `
    width: 100%;
  `}

  ${props => props.maxHeight && `
    max-height: ${props.maxHeight}px;
  `}

  ${props => props.minWidth && `
    min-width: ${props.minWidth}px;
  `}

  ${props => props.inputWidth && `
    width: ${props.inputWidth}px;
  `}

  ${props => props.alignCenter && `
    text-align: center;
  `}

  ${props => props.basic && `
    border: none;
    padding: 0 ${UNIT * 0.25}px;
  `}

  ${props => props.basicPadding && `
    border: none;
    padding: ${UNIT * 0.5}px ${UNIT * 1}px !important;
  `}

  ${props => props.paddingHorizontal && `
    padding-left: ${props.paddingHorizontal}px;
    padding-right: ${props.paddingHorizontal}px;
  `}

  ${props => props.paddingVertical && `
    padding-bottom: ${props.paddingVertical}px;
    padding-top: ${props.paddingVertical}px;
  `}

  ${props => props.basic && !props.noBackground && `
    background-color: ${(props.theme.interactive || light.interactive).focusBorder};

    &:active,
    &:focus,
    &:hover {
      background-color: ${(props.theme.interactive || light.interactive).focusBorder};
    }
  `}

  ${props => props.basic && props.noBackground && `
    background-color: none;

    &:active,
    &:focus,
    &:hover {
      background-color: ${(props.theme.interactive || light.interactive).defaultBorder};
    }
  `}

  ${props => props.info && `
    background-color: ${(props.theme.brand || light.brand).water100} !important;

    &:active,
    &:focus,
    &:hover {
      background-color: ${(props.theme.brand || light.brand).water100} !important;
    }
  `}

  ${props => props.defaultColor && `
    background-color: ${(props.theme.monotone || light.monotone).grey200} !important;

    &:active,
    &:focus,
    &:hover {
      background-color: ${(props.theme.monotone || light.monotone).grey200} !important;
    }
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}

  ${props => props.disablePointerEvents && `
    pointer-events: none;
  `}
`;

const LabelWrapperStyle = styled.div`
  margin-bottom: ${UNIT * 0.75}px;
`;

const InputWrapper = ({
  afterIcon,
  afterIconClick,
  beforeIcon,
  fullWidth,
  input,
  label,
  labelDescription,
  labelFixed,
  meta,
  name,
  onChange,
  placeholder,
  readOnly,
  required,
  setContentOnMount,
  showLabelRequirement,
  small,
  topPosition,
  type: typeProp,
  value,
  visible = true,
  width,
  ...props
}: InputWrapperProps & InputWrapperInternalProps, ref) => {
  const hasError: boolean = !!(meta && meta.touched && meta.error);

  const iconProps = {
    muted: true,
    size: UNIT * 2.5,
  };
  const AfterIconEl = afterIcon && (
    <IconContainerStyle right>
      {React.cloneElement(afterIcon, iconProps)}
    </IconContainerStyle>
  );

  const [content, setContent] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const showLabel = showLabelRequirement ? showLabelRequirement({
    content,
    isFocused,
  }) : (isFocused || !!content);

  useEffect(() => {
    if (setContentOnMount && !content) {
      setContent(value);
    }
  }, [content, setContent, setContentOnMount, value]);

  return (
    <ContainerStyle fullWidth={fullWidth} visible={visible}>
      {(labelFixed || labelDescription) && (
        <LabelWrapperStyle>
          <div>
            {labelFixed && (
              <Text bold inline small={small}>
                {labelFixed} {required && (
                  <Text inline small>
                    required
                  </Text>
                )}
              </Text>
            )}
          </div>

          {labelDescription && (
            <Text
              // @ts-ignore
              dangerouslySetInnerHTML={{
                __html: labelDescription,
              }}
              small
            />
          )}
        </LabelWrapperStyle>
      )}

      {beforeIcon && (
        <IconContainerStyle top={topPosition} compact divider>
          {React.cloneElement(beforeIcon, iconProps)}
        </IconContainerStyle>
      )}
      {afterIconClick && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            afterIconClick();
          }}
        >
          {AfterIconEl}
        </a>
      )}
      {!afterIconClick && AfterIconEl}

      {React.cloneElement(input, {
        afterIcon,
        beforeIcon,
        danger: hasError,
        hasContent: content,
        isFocused: showLabel,
        label: (label === 0 ? '0' : label),
        name,
        onBlur: (e) => {
          if (props.onBlur) {
            props.onBlur(e);
          }
          setIsFocused(false);
          setIsTouched(true);
        },
        onChange: (e) => {
          // @ts-ignore
          setContent(e.target.value);
          if (onChange) {
            onChange(e);
          }
        },
        onFocus: (e) => {
          if (props.onFocus) {
            props.onFocus(e);
          }
          setIsFocused(true);
        },
        placeholder: (label || label === 0) ? (showLabel ? '' : label) : placeholder,
        readOnly,
        ref,
        type: typeProp,
        value,
        width,
      })}

      {((meta?.touched && meta?.error) || (!isFocused && isTouched && !content && required)) && (
        <Text danger small>
          {meta?.error || 'This field is required.'}
        </Text>
      )}
    </ContainerStyle>
  );
};

export default React.forwardRef(InputWrapper);
