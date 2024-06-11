import React from 'react';
import styles from '@styles/scss/components/Text/Text.module.scss';

type TextProps = {
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
  small?: boolean;
  xsmall?: boolean;
};

function Text({ children, inline, small, xsmall, ...props }: TextProps) {
  const classNames = [
    small ? styles['text-small'] : xsmall ? styles['text-xsmall'] : styles.text,
    props?.className || '',
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
