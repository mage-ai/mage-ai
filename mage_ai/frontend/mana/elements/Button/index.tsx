import React from 'react';

import ButtonGroup from './Group';
import Tag from '../../components/Tag';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';

type ButtonStyleProps = {
  Icon?: ({ ...props }: any) => any;
  IconAfter?: ({ ...props }: any) => any;
  anchor?: boolean;
  children?: React.ReactNode;
  small?: boolean;
};

type ButtonProps = {
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  tag?: string;
} & ButtonStyleProps &
  WithLoggingProps;

function Button({
  anchor,
  asLink,
  basic,
  children,
  primary,
  secondary,
  small,
  tag,
  ...props
}: ButtonProps) {
  const HTMLTag = anchor || asLink ? 'a' : 'button';
  const { Icon, IconAfter } = props;

  const buttonClasses = [
    styles.button,
    anchor || asLink ? styles.anchor : '',
    styles.row,
    small ? styles.small : '',
  ].join(' ');

  return (
    <HTMLTag
      {...props}
      className={buttonClasses}
      style={{
        gridTemplateColumns: [
          Icon ? 'auto' : '',
          children ? '1fr' : '',
          tag ? 'auto' : '',
          IconAfter ? 'auto' : '',
        ].join(' '),
      }}
    >
      {Icon && <Icon inverted={primary || secondary} small={small} />}

      {children}

      {tag && (
        <Tag inverted={primary || secondary} passthrough secondary={basic}>
          {tag}
        </Tag>
      )}

      {IconAfter && <IconAfter inverted={primary || secondary} small={small} />}
    </HTMLTag>
  );
}

function ButtonWrapper(props: ButtonProps) {
  return useWithLogging(Button)(props);
}

export { ButtonGroup };
export default ButtonWrapper;
