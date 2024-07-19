import React, { useMemo } from 'react';
import Text, { TextProps } from '../Text';
import styles from '@styles/scss/elements/List/List.module.scss';
import { hashCode, isJsonString } from '@utils/string';
import { isObject } from '@utils/hash';
import { withStyles } from '../../hocs/withStyles';

export type ListProps = {
  asRows?: boolean;
  children?: React.ReactNode;
  itemClassName?: (item: any) => string;
  items?: string[];
  ol?: boolean;
  parseItems?: boolean;
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

const RowStyled = withStyles<TextProps>(styles, {
  HTMLTag: 'div',
  classNames: ['list', 'row'],
});

export default function List({ asRows, children, itemClassName, items, ol, parseItems, ul, ...rest }: ListProps) {
  const El = asRows
    ? RowStyled
    : (ol && !ul) ? OrderedStyled : UnorderedStyled;

  const itemsDisplay = useMemo(() => {
    if ((items?.length ?? 0) === 0) return;

    if (!parseItems) return items;

    const ItemEl = asRows ? 'div' : ListItemStyled;

    return items?.map((v, index: number) => {
      let val2 = v;

      if (isJsonString(val2)) {
        val2 = JSON.parse(val2);
      }

      if (Array.isArray(val2) || isObject(val2)) {
        try {
          val2 = JSON.stringify(val2, null, 2);
        } catch(err) {
          console.log(err);
        }
      } else if (typeof val2 === 'string') {
        val2 = val2.replace(/\n/g, '\\n');
      }

      return (
        <ItemEl
          className={[
            styles.item,
            itemClassName && itemClassName(val2),
          ].filter(Boolean).join(' ')}
          key={`${hashCode(String(val2 ?? ''))}-${index}`}
        >
          <Text {...rest}>
            {val2}
          </Text>
        </ItemEl>
      );
    });
  }, [asRows, itemClassName, items, parseItems, rest]);

  return (
    <El>
      {itemsDisplay}

      {children && React.Children.map(children, (child, index: number) => (
        <ListItemStyled
          className={styles.item}
          key={`${(child as React.ReactElement)?.key ?? index}`}
        >
          {child}
        </ListItemStyled>
      ))}
    </El>
  );
}
