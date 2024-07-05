import { MenuItemType } from '@mana/hooks/useContextMenu';
import DashedDivider from '@mana/elements/Divider/DashedDivider';
import Grid from '@mana/components/Grid';
import { Code, Builder, CaretDown, CaretLeft } from '@mana/icons';
import Text from '@mana/elements/Text';
import Link from '@mana/elements/Link';
import Button, { ButtonProps } from '@mana/elements/Button';
import { MenuGroupType } from './interfaces';
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
  const [selectedButtonIndex, setSelectedButtonIndex] = useState<number>(null);
  const [selectedGroupsByLevel, setSelectedGroupsByLevel] = useState<MenuGroupType[]>(null);

  const groups = useMemo(() => buildGroups ? buildGroups((
    event: MouseEvent,
    item: MenuGroupType,
  ) => {
    const {
      groups,
    } = item;

    setSelectedGroupsByLevel([
      ...(groups?.reverse() ?? []),
      item,
    ]);
    setSelectedButtonIndex(null);
  }) : (groupsProp ?? []), [buildGroups, groupsProp]);

  const buttons = useMemo(() => {
    const defaultState = selectedGroupsByLevel === null;

    const countTotal = groups?.length ?? 0;
    const count = selectedGroupsByLevel?.length ?? 0;
    const inner = [];
    const activeIndex = count - 1;

    groups?.slice(0, count + 1)?.forEach(({
      label,
      uuid,
    }, idx: number) => {
      const selected = count >= 1 && idx === Math.min(activeIndex + 1, countTotal - 1);
      const first = idx === 0;
      const last = idx === count;
      const initial = (defaultState && idx === 0);
      const done = idx <= activeIndex;
      const group = done ? selectedGroupsByLevel?.[idx] : null;
      const labelUse = group?.name ?? group?.label ?? label;
      const uuidUse = group?.uuid ?? uuid;

      const divider = (
        <div className={stylesNavigation['diagnoal-line-container']} key={`group-${idx}-divider`}>
          <div className={stylesNavigation['diagonal-line']}>
            <DashedDivider height={1} vertical />
          </div>
        </div>
      );

      if (!first && idx > activeIndex) {
        inner.push(divider)
      }

      inner.push(
        <Link
          activeColorOnHover
          className={[
            stylesNavigation.link,
          ].join(' ')}
          key={`${uuid}-label`}
          nowrap
          onClick={(event: any) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedButtonIndex(Math.min(
              idx,
              selectedGroupsByLevel === null
                ? 0
                : (selectedGroupsByLevel?.length - 1 ?? 0),
            ));
          }}
          secondary
          semibold={done}
          small
          success={selected}
          wrap
        >
          <Grid
            alignItems="center"
            autoFlow="column"
            className={[
              stylesNavigation.grid,
              selected ? stylesNavigation['selected'] : '',
              done ? stylesNavigation['done'] : '',
              done ? stylesHeader[`done-${idx}`] : '',
            ].filter(Boolean).join(' ')}
            columnGap={6}
            paddingLeft={11 + (!first && selected ? (last ? 6 : 3) : 0)}
            paddingRight={5 + (!selected ? 6 : 0)}
            style={{
              zIndex: count - idx,
            }}
          >
            {((typeof labelUse === 'function' ? labelUse?.() : labelUse) || uuidUse)}

            {(selected || initial) && <CaretDown secondary size={10} />}
          </Grid>
        </Link>
      );
    });

    return inner;
  }, [groups, selectedGroupsByLevel]);

  const currentGroupToSelect = useMemo(() => {
    const currentGroup = selectedButtonIndex === null ? null : groups?.[0];
    const openItems = selectedGroupsByLevel?.map(({ index: row, level: column }) => ({
      column,
      row,
    }));

    return (
      <MenuManager
        direction={LayoutDirectionEnum.RIGHT}
        handleOpen={(prev, levelToClose: number) => {
          const previouslyOpen =
            typeof prev === 'function' ? prev(selectedButtonIndex !== null) : prev;

          if (previouslyOpen && levelToClose === 0) {
            setSelectedButtonIndex(null);
          }
        }}
        isOpen={!!currentGroup}
        items={currentGroup?.items}
        key={currentGroup?.uuid}
        openItems={openItems}
        uuid={currentGroup?.uuid}
      >
        <div
          className={[
            stylesHeader.button,
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
  }, [buttons, groups, selectedButtonIndex, selectedGroupsByLevel]);

  return (
    <>
      {currentGroupToSelect}
    </>
  );
}
