import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import Badge from '@oracle/components/Badge';
import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleMenu from '@oracle/components/ToggleMenu';
import Tooltip from '@oracle/components/Tooltip';
import { Add, Close, Ellipsis, Filter, Group, Search, Trash } from '@oracle/icons';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import {
  BUTTON_PADDING,
  ConfirmDialogueOpenEnum,
  POPUP_MENU_WIDTH,
  POPUP_TOP_OFFSET,
  SHARED_BUTTON_PROPS,
  SHARED_TOOLTIP_PROPS,
} from './constants';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { UNIT } from '@oracle/styles/units/spacing';
import { getNestedTruthyValuesCount } from '@utils/hash';
import { isViewer } from '@utils/session';

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
  groupButtonProps?: {
    menuItems: FlyoutMenuItemType[];
    groupByLabel?: string;
  }
  query?: {
    [keyof: string]: string[];
  };
  searchProps?: {
    placeholder?: string;
    onChange: (text: string) => void;
    value: string;
  }
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
  filterOptions = {},
  filterValueLabelMapping,
  groupButtonProps,
  moreActionsMenuItems,
  query = {},
  searchProps,
  secondaryActionButtonProps,
  selectedRowId,
  setSelectedRow,
}: ToolbarProps) {
  const isViewerRole = isViewer();
  const router = useRouter();
  const addButtonMenuRef = useRef(null);
  const filterButtonMenuRef = useRef(null);
  const groupButtonMenuRef = useRef(null);
  const moreActionsButtonMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  const [addButtonMenuOpen, setAddButtonMenuOpen] = useState<boolean>(false);
  const [filterButtonMenuOpen, setFilterButtonMenuOpen] = useState<boolean>(false);
  const [groupButtonMenuOpen, setGroupButtonMenuOpen] = useState<boolean>(false);
  const [moreActionsMenuOpen, setMoreActionsMenuOpen] = useState<boolean>(false);
  const [confirmationDialogueOpenIdx, setConfirmationDialogueOpenIdx] = useState<number>(null);
  const disabledActions = !selectedRowId;

  const closeAddButtonMenu = useCallback(() => setAddButtonMenuOpen(false), []);
  const closeFilterButtonMenu = useCallback(() => setFilterButtonMenuOpen(false), []);
  const closeGroupButtonMenu = useCallback(() => setGroupButtonMenuOpen(false), []);
  const closeMoreActionsMenu = useCallback(() => setMoreActionsMenuOpen(null), []);
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
  const {
    placeholder: searchPlaceholder,
    onChange: onSearchChange,
    value: searchValue,
  } = searchProps || {};

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
      topOffset={1}
      uuid="Table/Toolbar/NewItemMenu"
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
        uuid="Table/Toolbar/AddButton"
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

  const filtersAppliedCount = useMemo(
    () => getNestedTruthyValuesCount(filterOptionsEnabledMapping),
    [filterOptionsEnabledMapping],
  );
  const filterButtonEl = useMemo(() => (
    <ToggleMenu
      compact
      onClickCallback={closeFilterButtonMenu}
      onClickOutside={closeFilterButtonMenu}
      onSecondaryClick={() => router.push('/pipelines')}
      open={filterButtonMenuOpen}
      options={filterOptionsEnabledMapping}
      parentRef={filterButtonMenuRef}
      query={query}
      setOpen={setFilterButtonMenuOpen}
      toggleValueMapping={filterValueLabelMapping}
    >
      <KeyboardShortcutButton
        {...SHARED_BUTTON_PROPS}
        afterElement={filtersAppliedCount > 0
          ?
            <Badge cyan noVerticalPadding>
              <Text bold inverted>
                {filtersAppliedCount}
              </Text>
            </Badge>
          : null
        }
        beforeElement={<Filter size={2 * UNIT} />}
        onClick={() => setFilterButtonMenuOpen(prevOpenState => !prevOpenState)}
        uuid="Table/Toolbar/FilterButton"
      >
        Filter
      </KeyboardShortcutButton>
    </ToggleMenu>
  ), [
    closeFilterButtonMenu,
    filterButtonMenuOpen,
    filterOptionsEnabledMapping,
    filterValueLabelMapping,
    filtersAppliedCount,
    query,
    router,
  ]);

  const {
    groupByLabel,
    menuItems: groupMenuItems,
  } = groupButtonProps || {};
  const groupButtonEl = useMemo(() => (
    <FlyoutMenuWrapper
      disableKeyboardShortcuts
      items={groupMenuItems}
      onClickCallback={closeGroupButtonMenu}
      onClickOutside={closeGroupButtonMenu}
      open={groupButtonMenuOpen}
      parentRef={groupButtonMenuRef}
      roundedStyle
      topOffset={1}
      uuid="Table/Toolbar/GroupMenu"
    >
      <KeyboardShortcutButton
        {...SHARED_BUTTON_PROPS}
        beforeElement={<Group size={2.5 * UNIT} />}
        onClick={() => {
          setGroupButtonMenuOpen(prevOpenState => !prevOpenState);
        }}
        uuid="Table/Toolbar/GroupButton"
      >
        {groupByLabel ? `Grouped by ${groupByLabel}` : 'Group'}
      </KeyboardShortcutButton>
    </FlyoutMenuWrapper>
  ), [
    closeGroupButtonMenu,
    groupButtonMenuOpen,
    groupMenuItems,
  ]);

  const moreActionsButtonEl = useMemo(() => (
    <FlyoutMenuWrapper
      disableKeyboardShortcuts
      items={moreActionsMenuItems}
      onClickCallback={closeMoreActionsMenu}
      onClickOutside={closeMoreActionsMenu}
      open={moreActionsMenuOpen}
      parentRef={moreActionsButtonMenuRef}
      roundedStyle
      topOffset={1}
      uuid="Table/Toolbar/MoreActionsMenu"
    >
      <Tooltip
        {...SHARED_TOOLTIP_PROPS}
        label="More actions"
      >
        <KeyboardShortcutButton
          Icon={Ellipsis}
          bold
          disabled={disabledActions}
          greyBorder
          onClick={() => setMoreActionsMenuOpen(prevState => !prevState)}
          smallIcon
          uuid="Table/Toolbar/MoreActionsButton"
        />
      </Tooltip>
    </FlyoutMenuWrapper>
  ), [
    closeMoreActionsMenu,
    disabledActions,
    moreActionsMenuOpen,
    moreActionsMenuItems,
  ]);

  return (
    <FlexContainer alignItems="center">
      {addButtonEl}
      <Spacing mr={BUTTON_PADDING} />
      {filterButtonEl}

      {groupMenuItems?.length > 0 &&
        <Spacing ml={BUTTON_PADDING}>
          {groupButtonEl}
        </Spacing>
      }

      {(!isViewerRole && onSecondaryActionClick) &&
        <Spacing ml={BUTTON_PADDING}>
          <Tooltip
            {...SHARED_TOOLTIP_PROPS}
            label={secondaryActionTooltip}
          >
            <KeyboardShortcutButton
              Icon={!isLoadingSecondaryAction && secondaryActionIcon}
              bold
              disabled={disabledActions}
              greyBorder
              loading={isLoadingSecondaryAction}
              onClick={openSecondaryActionConfirmDialogue
                ? () => setConfirmationDialogueOpenIdx(ConfirmDialogueOpenEnum.SECONDARY)
                : onSecondaryActionClick
              }
              smallIcon
              uuid="Table/Toolbar/SecondaryActionButton"
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

      {(!isViewerRole && onDelete) &&
        <Spacing ml={BUTTON_PADDING}>
          <Tooltip
            {...SHARED_TOOLTIP_PROPS}
            label={`Delete ${item}`}
          >
            <KeyboardShortcutButton
              Icon={!isLoadingDelete && Trash}
              bold
              disabled={disabledActions}
              greyBorder
              loading={isLoadingDelete}
              onClick={() => setConfirmationDialogueOpenIdx(ConfirmDialogueOpenEnum.DELETE)}
              smallIcon
              uuid="Table/Toolbar/DeleteButton"
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

      {(!isViewerRole && moreActionsMenuItems?.length > 0) &&
        <Spacing ml={BUTTON_PADDING}>
          {moreActionsButtonEl}
        </Spacing>
      }

      {onSearchChange &&
        <>
          <Spacing ml={BUTTON_PADDING} />
          <Flex flex={1}>
            <TextInput
              afterIcon={searchValue ? <Close /> : null}
              afterIconClick={() => {
                onSearchChange('');
                searchInputRef?.current?.focus();
              }}
              afterIconSize={UNIT * 1.5}
              beforeIcon={<Search />}
              borderRadius={BORDER_RADIUS}
              defaultColor
              fullWidth
              greyBorder
              maxWidth={UNIT * 60}
              onChange={e => onSearchChange(e.target.value)}
              paddingVertical={9}
              placeholder={searchPlaceholder ? searchPlaceholder : null}
              ref={searchInputRef}
              value={searchValue}
            />
          </Flex>
        </>
      }
    </FlexContainer>
  );
}

export default Toolbar;
