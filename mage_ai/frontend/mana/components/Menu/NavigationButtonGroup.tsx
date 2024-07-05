import { MenuItemType } from '@mana/hooks/useContextMenu';
import DashedDivider from '@mana/elements/Divider/DashedDivider';
import Grid from '@mana/components/Grid';
import { Code, Builder, CaretDown, CaretLeft } from '@mana/icons';
import Text from '@mana/elements/Text';
import Link from '@mana/elements/Link';
import Button, { ButtonProps } from '@mana/elements/Button';
import { BuildGroupOptions } from './interfaces';
import MenuManager from '@mana/components/Menu/MenuManager';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import stylesNavigation from '@styles/scss/components/Menu/NavigationButtonGroup.module.scss';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { useCallback, useMemo, useState } from 'react';

type NavigationButtonGroupProps = {
  buildGroups?: (onClick: (event: MouseEvent, opts: BuildGroupOptions) => void) => MenuItemType[];
  groups?: MenuItemType[];
}
export default function NavigationButtonGroup({
  buildGroups,
  groups: groupsProp,
}: NavigationButtonGroupProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(null);
  const [selectedGroupsByLevel, setSelectedGroupsByLevel] = useState<{
    group: MenuItemType;
    item: MenuItemType;
    level: number;
  }[]>(null);

  const handleClickItem = useCallback(() => {
    setSelectedGroupsByLevel
  }, [groupsProp]);

  const groups = useMemo(() => buildGroups ? buildGroups((
    event: MouseEvent,
    opts: BuildGroupOptions,
  ) => {
    const {
      group,
      index,
      item,
      level,
    } = opts;
    // setSelectedGroupsByLevel((prev) => {
    //   const next = [...(prev ?? [])];
    //   next[index] = {
    //     group,
    //     item,
    //     level,
    //   };
    //   return next;
    // });
    //
    console.log('!!!!!!!!!!!!!!!!', opts)
  }) : (groupsProp ?? []), [buildGroups, groupsProp]);


  const buttons = useMemo(() => {
    const defaultState = selectedIndex === null;

    const count = groups?.length ?? 0;
    const inner = [];

    groups?.forEach(({
      label,
      uuid,
    }, idx: number) => {
      const selected = idx === selectedIndex;
      const first = idx === 0;
      const last = idx === count - 1;
      const initial = (defaultState && idx === 0);

      const divider = (
        <div className={stylesNavigation['diagnoal-line-container']} key={`group-${idx}-divider`}>
          <div className={stylesNavigation['diagonal-line']}>
            <DashedDivider height={1} vertical />
          </div>
        </div>
      );

      if (idx > selectedIndex) {
        inner.push(divider)
      }

      inner.push(
        <Link
          key={`${uuid}-label`}
          onClick={(event: any) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedIndex(idx);
            console.log('CLICKED LINK!!!!!!!!!!!!!', idx)
          }}
          wrap
        >
          <Grid
            alignItems="center"
            autoFlow="column"
            className={[
              stylesNavigation.grid,
              selected ? stylesNavigation['selected'] : '',
              last ? stylesNavigation['last'] : '',
              idx < selectedIndex ? stylesNavigation['done'] : '',
              idx < selectedIndex ? stylesHeader[`done-${idx}`] : '',
            ].filter(Boolean).join(' ')}
            columnGap={6}
            paddingLeft={11 + (!first && selected ? (last ? 6 : 3) : 0)}
            paddingRight={5 + (!selected ? 6 : 0)}
            style={{
              zIndex: count - idx,
            }}
          >
            <Text
              muted={!selected && !initial}
              nowrap
              secondary={idx > selectedIndex}
              semibold
              small
              success={selected}
            >
              {(typeof label === 'function' ? label?.() : label) || uuid}
            </Text >

            {(selected || initial) && <CaretDown secondary size={10} />}
          </Grid>
        </Link>
      );
    });

    return inner;
  }, [groups, selectedIndex]);

  const currentGroupToSelect = useMemo(() => {
    const currentGroup = selectedIndex === null ? null : groups?.[selectedIndex];
    console.log(currentGroup)

    return (
      <MenuManager
        direction={LayoutDirectionEnum.RIGHT}
        handleOpen={(prev) => {
          const open = typeof prev === 'function' ? prev(selectedIndex !== null) : prev;
          console.log(open, selectedIndex, !open && selectedIndex !== null)
          if (!open && selectedIndex !== null) {
            setSelectedIndex(null);
          }
        }}
        items={currentGroup?.items}
        key={currentGroup?.uuid}
        openState={!!currentGroup}
        uuid={currentGroup?.uuid}
      >
        <div
          className={[
            stylesHeader.button, ,
            stylesNavigation.button,
          ].join(' ')}
          style={{
            gridTemplateColumns: '',
          }}
        >
          <Grid
            alignItems="center"
            autoColumns="min-content"
            autoFlow="column"
            height="100%"
          >
            {buttons}
          </Grid >
        </div>
      </MenuManager>
    );
  }, [buttons, groups, selectedIndex]);

  return (
    <>
      {currentGroupToSelect}
    </>
  );
}
