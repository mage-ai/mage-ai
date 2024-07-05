import { MenuItemType } from '@mana/hooks/useContextMenu';
import DashedDivider from '@mana/elements/Divider/DashedDivider';
import Grid from '@mana/components/Grid';
import { Code, Builder, CaretDown, CaretLeft } from '@mana/icons';
import Text from '@mana/elements/Text';
import Button, { ButtonProps } from '@mana/elements/Button';
import MenuManager from '@mana/components/Menu/MenuManager';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import stylesNavigation from '@styles/scss/components/Menu/NavigationButtonGroup.module.scss';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import { useMemo, useState } from 'react';

type NavigationButtonGroupProps = {
  groups: MenuItemType[];
}
export default function NavigationButtonGroup({ groups }: NavigationButtonGroupProps) {
  const [selectedGroupsByLevel, setSelectedGroupsByLevel] = useState<MenuItemType[]>([]);

  const currentGroupToSelect = useMemo(() => {
    const selectedIndex = 2 ?? (selectedGroupsByLevel?.length ?? 0);
    const currentGroup = groups?.[selectedIndex];

    const count = groups?.length ?? 0;
    const inner = [];

    groups?.forEach(({
      label,
      uuid,
    }, idx: number) => {
      const selected = idx === selectedIndex;
      const first = idx === 0;
      const last = idx === count - 1;

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
          key={`${uuid}-label`}
          paddingLeft={11 + (!first && selected ? (last ? 6 : 3) : 0)}
          paddingRight={5 + (!selected ? 6 : 0)}
          style={{
            zIndex: count - idx,
          }}
        >
          {/* {(!first && !selected) && divider} */}

          <Text
            muted={!selected}
            nowrap
            secondary={idx > selectedIndex}
            semibold
            small
            success={selected}
          >
            {label?.() ?? uuid}
          </Text >

          {selected && <CaretDown secondary size={10} />}

          {/* {(!last && !selected) && divider} */}
        </Grid>
      );
    });
    return (
      <MenuManager
        direction={LayoutDirectionEnum.RIGHT}
        items={currentGroup?.items}
        key={currentGroup?.uuid}
        uuid={currentGroup?.uuid}
      >
        <Button
          className={[
            stylesHeader.button, ,
            stylesNavigation.button,
          ].join(' ')}
          small
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
            {inner}
          </Grid >
        </Button>
      </MenuManager>
    );
  }, [groups, selectedGroupsByLevel]);

  return (
    <>
      {currentGroupToSelect}
    </>
  );
}
