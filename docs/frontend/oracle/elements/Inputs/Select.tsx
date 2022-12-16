import React from 'react';
import styled from 'styled-components';

import InputWrapper, { InputWrapperProps, SHARED_INPUT_STYLES } from './InputWrapper';
import light from '@oracle/styles/themes/light';
import { UNIT } from '../../styles/units/spacing';

export type SelectProps = {
  backgroundColor?: string;
  beforeIcon?: any;
  color?: string;
  cyan?: boolean;
  children?: any;
  hasContent?: boolean;
  showPlaceholder?: boolean;
} & InputWrapperProps;

const ArrowDownElString = `
  <svg width='12' height='12' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'>
    <path
      clip-rule='evenodd'
      d='M8.0015 11.7109L14.0022 5.71017L12.588 4.29597L7.99485 8.88914L3.40754 4.34482L2 5.76567L8.0015 11.7109Z'
      fill='%23B4B8C0'
      fill-rule='evenodd'
    />
  </svg>`;

const SelectStyle = styled.select<SelectProps>`
  ${SHARED_INPUT_STYLES}
  background-image: url("data:image/svg+xml;utf8,${ArrowDownElString}");
  background-repeat: no-repeat;
  background-position: -webkit-calc(100% - ${UNIT}px) center;
  background-position: calc(100% - ${UNIT}px) center;
  padding-right: ${UNIT * 2.5}px;

  &:hover {
    cursor: pointer;
  }

  ${(props) => !props.hasContent && !props.showPlaceholder && `
    color: ${(props.theme.content || light.content).muted};
  `}

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => props.color && `
    color: ${props.color};
  `}

  ${props => props.showPlaceholder && `
    color: ${(props.theme.content || light.content).inverted};
  `}
`;

const Select = ({
  beforeIcon,
  children,
  label,
  placeholder,
  ...props
}: SelectProps, ref) => (
  <InputWrapper
    {...props}
    beforeIcon={beforeIcon}
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
