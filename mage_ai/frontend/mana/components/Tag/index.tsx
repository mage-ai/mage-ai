import React from 'react';

type TagProps = {
  children: React.ReactNode;
  inverted?: boolean;
  passthrough?: boolean;
  secondary?: boolean;
};

function Tag({ children, inverted, passthrough, secondary }: TagProps) {
  const tagClasses = [
    styles.tag,
    inverted ? styles['tag--inverted'] : '',
    secondary ? styles['tag--secondary'] : '',
    passthrough ? styles['tag--passthrough'] : '',
  ].join(' ');

  return <div className={tagClasses}>{children}</div>;
}

export default Tag;
