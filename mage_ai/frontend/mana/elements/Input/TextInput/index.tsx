import React from 'react';
import styled from 'styled-components';

import inputs, { StyleProps } from '../../../styles/inputs';

type InputStyleProps = {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
} & StyleProps;

type InputProps = {
  number?: boolean;
  placeholder?: string;
  defaultValue?: string;
} & InputStyleProps;

const InputStyled = styled.input<InputStyleProps>`
  ${inputs}
`;

function TextInput({ number, onChange, defaultValue, ...props }: InputProps, ref) {
  return (
    <InputStyled
      {...props}
      defaultValue={defaultValue}
      onChange={onChange}
      ref={ref}
      type={number ? 'number' : 'text'}
    />
  );
}

export default React.forwardRef(TextInput);
