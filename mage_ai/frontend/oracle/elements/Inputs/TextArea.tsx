import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import InputWrapper, { InputWrapperProps, SHARED_INPUT_STYLES } from './InputWrapper';

export type TextAreaProps = {
  autoGrow?: boolean;
  rows?: number;
} & InputWrapperProps;

const TextAreaStyle = styled.textarea<TextAreaProps>`
  ${SHARED_INPUT_STYLES}
`;

function TextArea(props: TextAreaProps, ref: React.Ref<HTMLTextAreaElement>) {
  const { autoGrow, onChange, rows = 3, value } = props;

  const [valueInternal, setValueInternal] = useState(value);

  // Reference to the textarea element
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to adjust height based on content
  useEffect(() => {
    if (textAreaRef.current && rows === null) {
      textAreaRef.current.style.height = 'auto'; // Reset height to compute new scrollHeight
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [valueInternal, rows]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // If rows is null, meaning auto-grow is enabled
      if (autoGrow) {
        e.target.style.height = 'auto'; // Reset height to compute new scrollHeight
        e.target.style.height = `${e.target.scrollHeight}px`;
      }

      setValueInternal(e.target.value);

      if (onChange) {
        onChange(e);
      }
    },
    [autoGrow, onChange],
  );

  return (
    <InputWrapper
      {...props}
      ref={ref}
      onChange={handleChange}
      // @ts-ignore
      input={<TextAreaStyle {...props} onChange={handleChange} ref={textAreaRef} rows={rows} />}
    />
  );
}

export default forwardRef(TextArea);
