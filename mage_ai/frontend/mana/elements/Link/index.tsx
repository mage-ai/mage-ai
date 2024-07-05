import NextLink from 'next/link';
import React, { useState } from 'react';
import styles from '@styles/scss/elements/Link/Link.module.scss';
import { motion } from 'framer-motion';
import { TextProps, buildTextStyleProps } from '../Text';

type LinkProps = {
  activeColorOnHover?: boolean;
  children?: React.ReactNode | string;
  className?: string;
  disabled?: boolean;
  display?: 'block' | 'inline-block' | 'inline';
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  wrap?: boolean;
} & TextProps;

const blinkAnimation = {
  blink: {
    opacity: [1, 0, 1, 0, 1],
    transition: { duration: 0.5, ease: 'easeInOut' }
  },
  initial: { opacity: 1 },
};

export default function Link({
  activeColorOnHover,
  children,
  className,
  disabled,
  display,
  href = '#',
  onClick,
  wrap,
  ...rest
}: LinkProps) {
  const {
    classNames,
    props
  } = buildTextStyleProps(rest as TextProps);

  const [isBlinking, setIsBlinking] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setIsBlinking(true);
    setTimeout(() => setIsBlinking(false), 500);

    if (onClick) {
      onClick(e);
    }
  };

  const HTMLTag = wrap ? 'a' : motion.a

  return (
    <NextLink href={href} passHref>
      <HTMLTag
        {...props}
        animate={isBlinking ? 'blink' : 'initial'}
        className={[
          styles.link,
          wrap ? styles.wrap : styles.base,
          activeColorOnHover && styles.activeColorOnHover,
          disabled && styles.disabled,
          className ?? '',
          display ? styles[display] : '',
          classNames ?? '',
        ].filter(Boolean).join(' ')}
        initial="initial"
        onClick={handleClick}
        variants={blinkAnimation}
      >
        {children}
      </HTMLTag>
    </NextLink>
  );
}
