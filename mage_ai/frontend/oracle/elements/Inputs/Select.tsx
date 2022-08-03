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
  <svg width='12' height='12' viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'>
    <path d='M4.70096 9.75c.57735 1 2.02073 1 2.59808 0l2.59807-4.5C10.4745 4.25 9.75278 3 8.59808 3H3.40192c-1.1547 0-1.87638 1.25-1.29903 2.25l2.59807 4.5z' fill='%23B1B8C4'/>
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
