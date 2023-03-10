import { useCallback, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { Add, Filter } from '@oracle/icons';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';

export type FilterQueryType = {
  'type[]'?: string[];
  'status[]'?: string[];
};

type ToolbarProps = {
  addButtonProps?: {
    label?: string;
    menuItems?: any[];
    isLoading?: boolean;
  }
  groupings?: string[];
  query?: FilterQueryType;
};

function Toolbar({
  addButtonProps,
  groupings,
  query,
}: ToolbarProps) {
  const addButtonMenuRef = useRef(null);
  const filterButtonMenuRef = useRef(null);
  const [addButtonMenuOpen, setAddButtonMenuOpen] = useState(false);
  const [filterButtonMenuOpen, setFilterButtonMenuOpen] = useState(false);

  const closeAddButtonMenu = useCallback(() => setAddButtonMenuOpen(false), []);
  const closeFilterButtonMenu = useCallback(() => setFilterButtonMenuOpen(false), []);

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
    <FlyoutMenuWrapper
      disableKeyboardShortcuts
      items={[]}
      onClickCallback={closeFilterButtonMenu}
      onClickOutside={closeFilterButtonMenu}
      open={filterButtonMenuOpen}
      parentRef={filterButtonMenuRef}
      roundedStyle
      uuid="table/toolbar/filter_menu"
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
    </FlyoutMenuWrapper>
  ), [closeFilterButtonMenu, filterButtonMenuOpen]);

  return (
    <FlexContainer alignItems="center">
      {addButtonEl}
      <Spacing mr={`${UNIT * 1.5}px`} />
      {filterButtonEl}
    </FlexContainer>
  );
}

export default Toolbar;
