import React from 'react';
import styled from 'styled-components';

import inputs, { StyleProps } from '../../../styles/inputs';

type InputStyleProps = {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
} & StyleProps;

type InputProps = {
  number?: boolean;
  placeholder?: string;
} & InputStyleProps;

const InputStyled = styled.input<InputStyleProps>`
  ${inputs}
`;

function TextInput({
  number,
  onChange,
  ...props
}: InputProps) {
  return (
    <InputStyled
      {...props}
      onChange={onChange}
      type={number ? 'number' : 'text'}
    />
  );
}

export default React.forwardRef(TextInput);
