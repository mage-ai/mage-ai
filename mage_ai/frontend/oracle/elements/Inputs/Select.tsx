import React from 'react';
import styled from 'styled-components';
import { renderToString } from 'react-dom/server';

import InputWrapper, { InputWrapperProps, SHARED_INPUT_STYLES } from './InputWrapper';
import light from '@oracle/styles/themes/light';
import { ArrowDown } from '@oracle/icons';
import { GRAY } from '@oracle/styles/colors/main';
import { UNIT } from '../../styles/units/spacing';

export type SelectProps = {
  backgroundColor?: string;
  cyan?: boolean;
  children?: any;
  hasContent?: boolean;
  showPlaceholder?: boolean;
} & InputWrapperProps;

const ArrowDownEl = (
  <ArrowDown fill={GRAY} />
);

const SelectStyle = styled.select<SelectProps>`
  ${SHARED_INPUT_STYLES}
  background-image: url('data:image/svg+xml;utf8,${renderToString(ArrowDownEl)}');
  background-repeat: no-repeat;

  &:hover {
    cursor: pointer;
  }

  ${(props) => !props.hasContent && !props.showPlaceholder && `
    color: ${(props.theme.content || light.content).muted};
  `}

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => !props.compact && `
    background-position: -webkit-calc(100% - ${UNIT * 0.25}px) center;
    background-position: calc(100% - ${UNIT * 0.25}px) center;
    background-size: ${UNIT * 3}px ${UNIT * 3}px;
    padding-right: ${UNIT * 3}px;
  `}

  ${props => props.compact && `
    background-position: -webkit-calc(100% - ${UNIT * 0}px) center;
    background-position: calc(100% - ${UNIT * 0}px) center;
    background-size: ${UNIT * 2.5}px ${UNIT * 2.5}px;
    padding-right: ${UNIT * 2.5}px;
  `}

  ${props => props.showPlaceholder && `
    color: ${(props.theme.content || light.content).inverted};
  `}
`;

const Select = ({
  children,
  label,
  placeholder,
  ...props
}: SelectProps, ref) => (
  <InputWrapper
    {...props}
    input={
      <SelectStyle {...props}>
        {(label || placeholder) && (
        <option
          disabled
          selected
          value=""
        >
          {label || placeholder}
        </option>
        )}
        {children}
      </SelectStyle>
      }
    label={label}
    placeholder={placeholder}
    ref={ref}
    setContentOnMount
    showLabelRequirement={({ content }) => !!content}
  />
);

export default React.forwardRef(Select);
