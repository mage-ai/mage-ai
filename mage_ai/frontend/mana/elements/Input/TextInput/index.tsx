import React from 'react';

type InputStyleProps = {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  basic?: boolean;
  small?: boolean;
  width?: string | number;
};

type InputProps = {
  number?: boolean;
  placeholder?: string;
} & InputStyleProps;

function TextInput({ number, onChange, basic, small, width, ...props }: InputProps, ref) {
  return (
    <input
      {...props}
      className={`
        ${styles.input}
        ${basic ? styles.basic : ''}
        ${small ? styles.small : ''}
      `}
      onChange={onChange}
      ref={ref}
      style={{ width }}
      type={number ? 'number' : 'text'}
    />
  );
}

export default React.forwardRef(TextInput);
