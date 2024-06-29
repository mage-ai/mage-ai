import React, { useState } from 'react';
import styled from 'styled-components';

import inputs, { StyleProps } from '../../../styles/inputs';

type InputStyleProps = {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
} & StyleProps;

type InputProps = {
  defaultValue?: string;
  italic?: boolean | ((value: any) => boolean);
  number?: boolean;
  placeholder?: string;
  required?: boolean;
} & InputStyleProps;

const InputStyled = styled.input<InputStyleProps>`
  ${inputs}
`;

function TextInput({
  defaultValue,
  italic,
  number,
  onChange,
  required,
  ...props
}: InputProps, ref: React.Ref<HTMLInputElement>) {
  const [value, setValue] = useState(defaultValue);

  return (
    <InputStyled
      {...props}
      italic={typeof italic === 'function' ? italic(value) : italic}
      onChange={event => {
        setValue(event.target.value);
        if (onChange) {
          onChange(event);
        }
      }}
      ref={ref}
      required={required}
      type={number ? 'number' : 'text'}
      value={value || ''}
    />
  );
}

export default React.forwardRef(TextInput);
