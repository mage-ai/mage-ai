import { useCallback, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleMenu from '@oracle/components/ToggleMenu';
import { Add, Filter } from '@oracle/icons';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';

type ToolbarProps = {
  addButtonProps?: {
    label?: string;
    menuItems?: any[];
    isLoading?: boolean;
  };
  filterOptions?: {
    [keyof: string]: string[];
  };
  filterValueLabelMapping?: {
    [keyof: string]: string;
  };
  groupings?: string[];
  query?: {
    [keyof: string]: string[];
  };
};

function Toolbar({
  addButtonProps,
  filterOptions,
  filterValueLabelMapping,
  groupings,
  query = {},
}: ToolbarProps) {
  const addButtonMenuRef = useRef(null);
  const filterButtonMenuRef = useRef(null);
  const [addButtonMenuOpen, setAddButtonMenuOpen] = useState(false);
  const [filterButtonMenuOpen, setFilterButtonMenuOpen] = useState(false);

  const closeAddButtonMenu = useCallback(() => setAddButtonMenuOpen(false), []);
  const closeFilterButtonMenu = useCallback(() => setFilterButtonMenuOpen(false), []);

  const filterOptionsEnabledMapping = useMemo(() => (
    Object.entries(filterOptions).reduce((mapping, [filterKey, values]) => {
      mapping[filterKey] = {};
      values.forEach(value => {
        const filterValueEnabled = query[`${filterKey}[]`]?.includes(value) || false;
        mapping[filterKey][value] = filterValueEnabled;
      });

      return mapping;
    }, {})
  ), [filterOptions, query]);

  const {
    label: addButtonLabel,
    menuItems: addButtonMenuItems,
    isLoading: isLoadingAddButton,
  } = addButtonProps || {};
  const addButtonEl = useMemo(() => (
    <FlyoutMenuWrapper
      disableKeyboardShortcuts
      items={addButtonMenuItems}
      onClickCallback={closeAddButtonMenu}
      onClickOutside={closeAddButtonMenu}
      open={addButtonMenuOpen}
      parentRef={addButtonMenuRef}
      roundedStyle
      uuid="table/toolbar/new_item_menu"
    >
      <KeyboardShortcutButton
        background={BUTTON_GRADIENT}
        beforeElement={<Add size={2.5 * UNIT} />}
        bold
        loading={isLoadingAddButton}
        onClick={e => {
          e.preventDefault();
          setAddButtonMenuOpen(prevOpenState => !prevOpenState);
        }}
        uuid="table/toolbar/add_button"
      >
        {addButtonLabel}
      </KeyboardShortcutButton>
    </FlyoutMenuWrapper>
  ), [
    addButtonLabel,
    addButtonMenuItems,
    addButtonMenuOpen,
    closeAddButtonMenu,
    isLoadingAddButton,
  ]);

  const filterButtonEl = useMemo(() => (
    <ToggleMenu
      compact
      onClickCallback={closeFilterButtonMenu}
      onClickOutside={closeFilterButtonMenu}
      open={filterButtonMenuOpen}
      options={filterOptionsEnabledMapping}
      parentRef={filterButtonMenuRef}
      query={query}
      setOpen={setFilterButtonMenuOpen}
      toggleValueMapping={filterValueLabelMapping}
    >
      <KeyboardShortcutButton
        beforeElement={<Filter size={2 * UNIT} />}
        bold
        onClick={e => {
          e.preventDefault();
          setFilterButtonMenuOpen(prevOpenState => !prevOpenState);
        }}
        uuid="table/toolbar/filter_button"
      >
        Filter
      </KeyboardShortcutButton>
    </ToggleMenu>
  ), [
    closeFilterButtonMenu,
    filterButtonMenuOpen,
    filterOptionsEnabledMapping,
    filterValueLabelMapping,
    query,
  ]);

  return (
    <FlexContainer alignItems="center">
      {addButtonEl}
      <Spacing mr={`${UNIT * 1.5}px`} />
      {filterButtonEl}
    </FlexContainer>
  );
}

export default Toolbar;
