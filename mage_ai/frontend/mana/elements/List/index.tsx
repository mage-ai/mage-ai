import React from 'react';
import styles from '@styles/scss/elements/List/List.module.scss';
import Text, { TextProps } from '../Text';
import { withStyles } from '../../hocs/withStyles';

export type ListProps = {
  children?: React.ReactNode;
  item?: string[];
  li?: boolean;
  ul?: boolean;
} & TextProps;

const ListItemStyled = withStyles<TextProps>(styles, {
  HTMLTag: 'li',
  classNames: ['list', 'li'],
});

const UnorderedStyled = withStyles<TextProps>(styles, {
  HTMLTag: 'ul',
  classNames: ['list', 'ul'],
});

const OrderedStyled = withStyles<TextProps>(styles, {
  HTMLTag: 'ol',
  classNames: ['list', 'ol'],
});

export default function List({ children, item, li, ul, ...rest }: ListProps) {
  const El = (li && !ul) ? OrderedStyled : UnorderedStyled;
  return (
    <El>
      {item?.map((item: string, index: number) => (
        <ListItemStyled
          className={styles.item}
          key={`${item}-${index}`}
        >
          <Text {...rest}>
            {item}
          </Text>
        </ListItemStyled>
      ))}

      {children && React.Children.map(children, (child, index: number) => (
        <ListItemStyled
          className={styles.item}
          key={`${(child as React.ReactElement)?.key ?? index}`}
        >
          {item}
        </ListItemStyled>
      ))}
    </El>
  );
}
