import React, { useState } from 'react';
import styled from 'styled-components';

import inputs, { StyleProps } from '../../../styles/inputs';

type InputStyleProps = {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
} & StyleProps;

type InputProps = {
  autoComplete?: string;
  defaultValue?: string;
  id?: string;
  italic?: boolean | ((value: any) => boolean);
  name?: string;
  number?: boolean;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
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
  id,
  name,
  ...props
}: InputProps, ref: React.Ref<HTMLInputElement>) {
  const [value, setValue] = useState(defaultValue);

  return (
    <InputStyled
      {...props}
      id={id}
      name={name}
      italic={(italic && typeof italic === 'function') ? (italic as (val: any) => boolean)?.(value) : italic}
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
