import React from 'react';

type TextProps = {
  children: React.ReactNode;
  inline?: boolean;
  small?: boolean;
  xsmall?: boolean;
};

function Text({ children, inline, small, xsmall, ...props }: TextProps) {
  const classNames = [
    small ? styles['text-small'] : xsmall ? styles['text-xsmall'] : styles.text,
    props.className,
  ].join(' ');

  return inline ? (
    <span {...props} className={classNames}>
      {children}
    </span>
  ) : (
    <p {...props} className={classNames}>
      {children}
    </p>
  );
}

export default Text;
