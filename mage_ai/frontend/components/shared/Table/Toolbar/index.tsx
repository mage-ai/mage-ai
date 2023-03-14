import { useCallback, useMemo, useRef, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleMenu from '@oracle/components/ToggleMenu';
import Tooltip from '@oracle/components/Tooltip';
import { Add, Filter, Trash } from '@oracle/icons';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';

const BUTTON_PADDING = `${UNIT * 1.5}px`;
const SHARED_BUTTON_PROPS = {
  bold: true,
  greyBorder: true,
  paddingBottom: 9,
  paddingTop: 9,
};

type ToolbarProps = {
  addButtonProps?: {
    label?: string;
    menuItems?: any[];
    isLoading?: boolean;
  };
  deleteRowProps?: {
    confirmationMessage: string;
    item: string;
    onDelete: (id: string) => void;
  }
  filterOptions?: {
    [keyof: string]: string[];
  };
  filterValueLabelMapping?: {
    [keyof: string]: string;
  };
  moreActionsLinkProps?: {
    label: string;
    onClick: () => void;
    uuid: string;
  }[];
  groupings?: string[];
  query?: {
    [keyof: string]: string[];
  };
  secondaryActionButtonProps?: {
    Icon: any;
    confirmationMessage?: string;
    isLoading?: boolean;
    label?: string;
    onClick: () => void;
    openConfirmationDialogue?: boolean;
    tooltip?: string;
  };
  selectedRowId: string;
  setSelectedRow: (row: any) => void;
};

function Toolbar({
  addButtonProps,
  deleteRowProps,
  filterOptions,
  filterValueLabelMapping,
  moreActionsLinkProps,
  groupings,
  query = {},
  secondaryActionButtonProps,
  selectedRowId,
  setSelectedRow,
}: ToolbarProps) {
  const addButtonMenuRef = useRef(null);
  const filterButtonMenuRef = useRef(null);
  const [addButtonMenuOpen, setAddButtonMenuOpen] = useState(false);
  const [filterButtonMenuOpen, setFilterButtonMenuOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [confirmationDialogueOpen, setConfirmationDialogueOpen] = useState(false);

  const closeAddButtonMenu = useCallback(() => setAddButtonMenuOpen(false), []);
  const closeFilterButtonMenu = useCallback(() => setFilterButtonMenuOpen(false), []);

  const {
    Icon: secondaryActionIcon,
    confirmationMessage: secondaryActionConfirmMessage,
    isLoading: isLoadingSecondaryAction,
    label: secondaryActionLabel,
    onClick: onSecondaryActionClick,
    openConfirmationDialogue: openSecondaryActionConfirmDialogue,
    tooltip: secondaryActionTooltip,
  } = secondaryActionButtonProps || {};
  const {
    confirmationMessage: deleteConfirmMessage,
    item,
    onDelete,
  } = deleteRowProps || {};

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
        {...SHARED_BUTTON_PROPS}
        background={BUTTON_GRADIENT}
        beforeElement={<Add size={2.5 * UNIT} />}
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
        {...SHARED_BUTTON_PROPS}
        beforeElement={<Filter size={2 * UNIT} />}
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

  const closeConfirmationDialogue = useCallback(() => setConfirmationDialogueOpen(false), []);

  return (
    <FlexContainer alignItems="center">
      {addButtonEl}
      <Spacing mr={BUTTON_PADDING} />
      {filterButtonEl}

      {(onSecondaryActionClick && selectedRowId) &&
        <Spacing ml={BUTTON_PADDING}>
          <Tooltip
            label={secondaryActionTooltip}
            size={null}
            widthFitContent
          >
            <KeyboardShortcutButton
              Icon={!isLoadingSecondaryAction && secondaryActionIcon}
              bold
              greyBorder
              loading={isLoadingSecondaryAction}
              onClick={onSecondaryActionClick}
              smallIcon
              uuid="table/toolbar/secondary_action_button"
            >
              {secondaryActionLabel}
            </KeyboardShortcutButton>
          </Tooltip>
        </Spacing>
      }

      {(onDelete && selectedRowId) &&
        <Spacing ml={BUTTON_PADDING}>
          <Tooltip
            label={`Delete ${item}`}
            size={null}
            widthFitContent
          >
            <KeyboardShortcutButton
              Icon={Trash}
              bold
              greyBorder
              onClick={() => setConfirmationDialogueOpen(prevState => !prevState)}
              smallIcon
              uuid="table/toolbar/delete_button"
            />
          </Tooltip>
          <ClickOutside
            onClickOutside={closeConfirmationDialogue}
            open={confirmationDialogueOpen}
          >
            <PopupMenu
              danger
              onCancel={closeConfirmationDialogue}
              onClick={() => {
                onDelete(selectedRowId);
                closeConfirmationDialogue();
                setSelectedRow(null);
              }}
              subtitle={deleteConfirmMessage}
              title={`Are you sure you want to delete the ${item} ${selectedRowId}?`}
              top={58}
              width={UNIT * 40}
            />
          </ClickOutside>
        </Spacing>
      }
    </FlexContainer>
  );
}

export default Toolbar;
