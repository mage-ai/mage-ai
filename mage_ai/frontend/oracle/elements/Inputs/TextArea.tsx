import React from 'react';
import styled from 'styled-components';

import InputWrapper, { InputWrapperProps, SHARED_INPUT_STYLES } from './InputWrapper';

export type TextAreaProps = {
  rows?: number;
} & InputWrapperProps;

const TextInputStyle = styled.textarea<TextAreaProps>`
  ${SHARED_INPUT_STYLES}
`;

const TextInput = ({ rows = 3, ...props }: TextAreaProps, ref) => (
  <InputWrapper
    {...props}
    // @ts-ignore
    input={<TextInputStyle rows={rows} {...props} />}
    ref={ref}
  />
);

export default React.forwardRef(TextInput);
