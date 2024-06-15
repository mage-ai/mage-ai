import React from 'react';
import styled, { css } from 'styled-components';

import ButtonGroup from './Group';
import Loading, { LoadingStyleEnum } from '../../components/Loading';
import Tag from '../../components/Tag';
import buttons, { StyleProps, sm as buttonsSm } from '../../styles/buttons';
import useWithLogging, { WithLoggingProps } from '../../hooks/useWithLogging';

type ButtonStyleProps = {
  Icon?: ({ ...props }: any) => any;
  IconAfter?: ({ ...props }: any) => any;
  anchor?: boolean;
  children?: React.ReactNode;
} & StyleProps;

type ButtonProps = {
  className?: string;
  id?: string;
  loading?: boolean;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
} & ButtonStyleProps &
  WithLoggingProps;

const cssRow = css<ButtonStyleProps>`
  align-items: center;
  column-gap: ${({ Icon, theme }) => theme.buttons.grid.column.gap[Icon ? 'base' : 'sm']}px;
  grid-auto-columns: min-content;
  grid-auto-flow: column;
  justify-content: space-between;
  white-space: nowrap;
`;

const CSS = css<ButtonStyleProps>`
  ${({ small }) => (small ? buttonsSm : buttons)}
  ${cssRow}
`;

const ButtonStyled = styled.button<ButtonStyleProps>`
  ${CSS}

  display: grid;
`;

const AStyled = styled.a<ButtonStyleProps>`
  ${CSS}

  display: inline;
`;

function Button({
  anchor,
  asLink,
  basic,
  children,
  loading,
  primary,
  secondary,
  small,
  tag,
  ...props
}: ButtonProps) {
  const HTMLTag = anchor || asLink ? AStyled : ButtonStyled;
  const { Icon, IconAfter } = props;
  const loadingRight = loading && Icon && !(tag || IconAfter);
  const loadingLeft = !loadingRight && loading && (!Icon || (!tag && !IconAfter));
  const loadingEl = (
    <div style={{ marginLeft: loadingRight ? 4 : 0, marginRight: loadingLeft ? 4 : 0 }}>
      <Loading loadingStyle={LoadingStyleEnum.BLOCKS} vertical />
    </div>
  );

  return (
    // @ts-ignore
    <HTMLTag
      {...props}
      {...(asLink ? { href: '#' } : {})}
      asLink={asLink}
      basic={basic}
      loading={loading ? true : undefined}
      primary={primary}
      secondary={secondary}
      small={small}
      style={{
        gridTemplateColumns: [
          Icon ? 'auto' : '',
          children ? '1fr' : '',
          tag ? 'auto' : '',
          IconAfter ? 'auto' : '',
        ].join(' '),
      }}
      tag={tag}
    >
      {Icon && !loadingLeft && <Icon inverted={primary || secondary} small={small} />}
      {loadingLeft && loadingEl}

      {children}

      {tag && !loadingRight && (
        <Tag inverted={primary || secondary} passthrough secondary={basic}>
          {tag}
        </Tag>
      )}

      {IconAfter && !loadingRight && <IconAfter inverted={primary || secondary} small={small} />}

      {loadingRight && loadingEl}
    </HTMLTag>
  );
}

function ButtonWrapper(props: ButtonProps) {
  return useWithLogging(Button)(props);
}

export { ButtonGroup };
export default ButtonWrapper;
