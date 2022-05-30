import React from 'react';
import styled from 'styled-components';

import InputWrapper, { InputWrapperProps, SHARED_INPUT_STYLES } from './InputWrapper';

export type TextInputProps = InputWrapperProps;

const TextInputStyle = styled.input<TextInputProps>`
  ${SHARED_INPUT_STYLES}
`;

const TextInput = ({ ...props }: TextInputProps, ref) => {
  return (
    <InputWrapper
      {...props}
      input={<TextInputStyle {...props} />}
      ref={ref}
    />
  );
};

export default React.forwardRef(TextInput);
