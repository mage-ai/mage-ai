import { useCallback, useMemo, useRef, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import ToggleMenu from '@oracle/components/ToggleMenu';
import Tooltip from '@oracle/components/Tooltip';
import { Add, Ellipsis, Filter, Trash } from '@oracle/icons';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import {
  BUTTON_PADDING,
  ConfirmDialogueOpenEnum,
  MenuOpenEnum,
  POPUP_MENU_WIDTH,
  POPUP_TOP_OFFSET,
  SHARED_BUTTON_PROPS,
} from './constants';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { UNIT } from '@oracle/styles/units/spacing';

type ToolbarProps = {
  addButtonProps?: {
    label?: string;
    menuItems?: FlyoutMenuItemType[];
    isLoading?: boolean;
  };
  deleteRowProps?: {
    confirmationMessage: string;
    isLoading: boolean;
    item: string;
    onDelete: (id: string) => void;
  }
  filterOptions?: {
    [keyof: string]: string[];
  };
  filterValueLabelMapping?: {
    [keyof: string]: string;
  };
  moreActionsMenuItems?: FlyoutMenuItemType[];
  groupings?: string[];
  query?: {
    [keyof: string]: string[];
  };
  secondaryActionButtonProps?: {
    Icon: any;
    confirmationDescription?: string;
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
  moreActionsMenuItems,
  groupings,
  query = {},
  secondaryActionButtonProps,
  selectedRowId,
  setSelectedRow,
}: ToolbarProps) {
  const addButtonMenuRef = useRef(null);
  const filterButtonMenuRef = useRef(null);
  const moreActionsButtonMenuRef = useRef(null);
  const [addButtonMenuOpen, setAddButtonMenuOpen] = useState(false);
  const [filterButtonMenuOpen, setFilterButtonMenuOpen] = useState(false);
  const [menuOpenIdx, setMenuOpenIdx] = useState<number>(null);
  const [confirmationDialogueOpenIdx, setConfirmationDialogueOpenIdx] = useState<number>(null);

  const closeAddButtonMenu = useCallback(() => setAddButtonMenuOpen(false), []);
  const closeFilterButtonMenu = useCallback(() => setFilterButtonMenuOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpenIdx(null), []);
  const closeConfirmationDialogue = useCallback(() => setConfirmationDialogueOpenIdx(null), []);

  const {
    Icon: secondaryActionIcon,
    confirmationDescription: secondaryActionConfirmDescription,
    confirmationMessage: secondaryActionConfirmMessage,
    isLoading: isLoadingSecondaryAction,
    label: secondaryActionLabel,
    onClick: onSecondaryActionClick,
    openConfirmationDialogue: openSecondaryActionConfirmDialogue,
    tooltip: secondaryActionTooltip,
  } = secondaryActionButtonProps || {};
  const {
    confirmationMessage: deleteConfirmMessage,
    isLoading: isLoadingDelete,
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
        onClick={() => setFilterButtonMenuOpen(prevOpenState => !prevOpenState)}
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

  const moreActionsButtonEl = useMemo(() => (
    <FlyoutMenuWrapper
      disableKeyboardShortcuts
      items={moreActionsMenuItems}
      onClickCallback={closeMenu}
      onClickOutside={closeMenu}
      open={menuOpenIdx === MenuOpenEnum.MORE_ACTIONS}
      parentRef={moreActionsButtonMenuRef}
      roundedStyle
      uuid="table/toolbar/more_actions_menu"
    >
      <Tooltip
        label="More actions"
        size={null}
        widthFitContent
      >
        <KeyboardShortcutButton
          Icon={Ellipsis}
          bold
          greyBorder
          onClick={() => setMenuOpenIdx(prevState => (
            prevState === MenuOpenEnum.MORE_ACTIONS ? null : MenuOpenEnum.MORE_ACTIONS
          ))}
          smallIcon
          uuid="table/toolbar/more_actions_button"
        />
      </Tooltip>
    </FlyoutMenuWrapper>
  ), [
    closeMenu,
    menuOpenIdx,
    moreActionsMenuItems,
  ]);

  return (
    <FlexContainer alignItems="center">
      {addButtonEl}
      <Spacing mr={BUTTON_PADDING} />
      {filterButtonEl}

      {(isLoadingSecondaryAction || isLoadingDelete) &&
        <Spacing ml={2}>
          <Spinner inverted />
        </Spacing>
      }

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
              onClick={openSecondaryActionConfirmDialogue
                ? () => setConfirmationDialogueOpenIdx(ConfirmDialogueOpenEnum.SECONDARY)
                : onSecondaryActionClick
              }
              smallIcon
              uuid="table/toolbar/secondary_action_button"
            >
              {secondaryActionLabel}
            </KeyboardShortcutButton>
          </Tooltip>
          <ClickOutside
            onClickOutside={closeConfirmationDialogue}
            open={confirmationDialogueOpenIdx === ConfirmDialogueOpenEnum.SECONDARY}
          >
            <PopupMenu
              onCancel={closeConfirmationDialogue}
              onClick={() => {
                onSecondaryActionClick();
                closeConfirmationDialogue();
                setSelectedRow(null);
              }}
              subtitle={secondaryActionConfirmDescription}
              title={secondaryActionConfirmMessage}
              top={POPUP_TOP_OFFSET}
              width={POPUP_MENU_WIDTH}
            />
          </ClickOutside>
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
              onClick={() => setConfirmationDialogueOpenIdx(ConfirmDialogueOpenEnum.DELETE)}
              smallIcon
              uuid="table/toolbar/delete_button"
            />
          </Tooltip>
          <ClickOutside
            onClickOutside={closeConfirmationDialogue}
            open={confirmationDialogueOpenIdx === ConfirmDialogueOpenEnum.DELETE}
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
              top={POPUP_TOP_OFFSET}
              width={POPUP_MENU_WIDTH}
            />
          </ClickOutside>
        </Spacing>
      }

      {(selectedRowId && moreActionsMenuItems?.length > 0) &&
        <Spacing ml={BUTTON_PADDING}>
          {moreActionsButtonEl}
        </Spacing>
      }
    </FlexContainer>
  );
}

export default Toolbar;
