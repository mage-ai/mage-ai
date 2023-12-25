import * as osPath from 'path';
import React, { useEffect, useMemo, useState } from 'react';
import { CSSTransition } from 'react-transition-group';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Circle from '@oracle/elements/Circle';
import CodeBlockHeaderProps from '../constants';
import Divider from '@oracle/elements/Divider';
import FileEditorHeader from '@components/FileEditor/Header';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Loading, { LoadingStyleEnum } from '@oracle/components/Loading';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { BLOCK_TYPE_NAME_MAPPING, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import { ChevronDownV2, ChevronUpV2, Menu, PanelCollapseLeft } from '@oracle/icons';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import {
  HeaderStyle,
  HeaderWrapperStyle,
  ICON_SIZE,
  InfoStyle,
  SubheaderButtonStyle,
  SubheaderMenuStyle,
  SubheaderStyle,
} from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

function CodeBlockHeader({
  block,
  buttons,
  executionState,
  menuGroups,
  selected,
  selectedHeaderTab,
  setSelectedHeaderTab,
  setSideMenuVisible,
  setSubheaderVisible,
  sideMenuVisible,
  subheaderVisible,
  subheaderVisibleDefault,
  subtitle,
  tabs,
  theme,
  title,
}: CodeBlockHeaderProps & {
  selectedHeaderTab?: TabType;
  setSelectedHeaderTab: (tab: TabType) => void;
  setSideMenuVisible?: (value: boolean) => void;
  setSubheaderVisible: (value: boolean) => void;
  subheaderVisible: boolean;
  sideMenuVisible?: boolean;
}, ref) {
  const {
    color: blockColor,
    language,
    status,
    type,
    uuid,
  } = block;

  useEffect(() => {
    setSubheaderVisible(subheaderVisibleDefault
      ? subheaderVisibleDefault?.(block)
      : false
    );
  }, []);

  const {
    active = false,
    running = false,
    waiting = false,
  }: {
    active: boolean;
    running: boolean;
    waiting: boolean;
  } = useMemo(() => {
    return {
      active: ExecutionStateEnum.IDLE !== executionState,
      running: ExecutionStateEnum.BUSY === executionState,
      waiting: ExecutionStateEnum.QUEUED === executionState,
    };
  }, [
    executionState,
  ]);

  const color = getColorsForBlockType(type, {
    blockColor,
    theme,
  });
  const Icon = BLOCK_TYPE_ICON_MAPPING[type];

  const titleEls = useMemo(() => {
    const arr = [];

    const titleParts = (title || uuid)?.split(osPath.sep);
    const titlePartsCount = titleParts?.length || 0;

    titleParts?.forEach((part: string, idx: number) => {
      if (idx >= 1) {
        arr.push(
          <div key={`${part}-spacing-${idx}`} style={{ paddingLeft: UNIT / 4, paddingRight: UNIT / 4 }}>
            <Text noWrapping muted>
              /
            </Text>
          </div>
        );
      }

      arr.push(
        <Text key={part} muted={idx < titlePartsCount - 1} noWrapping weightStyle={4}>
          {part}
        </Text>
      );
    });

    return arr;
  }, [
    title,
    uuid,
  ]);

  const {
    buttonsDropdown,
    buttonsVisible,
  } = useMemo(() => {
    const buttonsDropdownInner = [];
    const buttonsVisibleInner = [];

    buttons?.forEach(({
      Icon: IconButton,
      color,
      description,
      disabled,
      icon,
      keyTextGroups,
      keyTextsPosition,
      keyboardShortcutValidation,
      label,
      loading,
      onClick,
      uuid: uuidButton,
      visible,
    }, idx: number) => {
      const iconOnly = (icon || IconButton) && !label;
      const iconEl = icon
        ? icon
        : IconButton && <IconButton fill={color} size={ICON_SIZE}/>;

      let el = (
        <KeyboardShortcutButton
          addPlusSignBetweenKeys
          backgroundColor={color}
          compact
          disabled={disabled && disabled?.({
            active,
            running,
            waiting,
          })}
          key={`KeyboardShortcutButton/${uuid}/${uuidButton}/${idx}`}
          keyTextGroups={keyTextGroups}
          keyTextsPosition={keyTextsPosition}
          keyboardShortcutValidation={keyboardShortcutValidation
            ? (ks: KeyboardShortcutType, index?: number) => keyboardShortcutValidation?.(
              ks,
              index,
              {
                block,
                selected,
              },
            )
            : null
          }
          loading={loading}
          noBackground={iconOnly}
          borderless={iconOnly}
          noPadding={iconOnly}
          onClick={() => {
            if (onClick) {
              onClick?.({
                selectedHeaderTab,
                setSelectedHeaderTab,
              });
            }
          }}
          outline
          // small
          uuid={`KeyboardShortcutButton/${uuid}/${uuidButton}/${idx}`}
        >
          {iconEl}
          {iconEl && label && <Spacing mr={1} />}
          {label && label?.()}
        </KeyboardShortcutButton>
      );

      if (description) {
        el = (
          <div style={{ position: 'relative' }}>
            <Tooltip
              appearAfter
              block
              label={description}
              size={null}
              widthFitContent
            >
              {el}
            </Tooltip>
          </div>
        );
      }

      if (!visible || visible?.({
        active,
        running,
        waiting,
      })) {
        buttonsVisibleInner.push(el);
        buttonsVisibleInner.push(
          <div key={`spacing/${uuid}/${uuidButton}/${idx}`} style={{ marginRight: 12 }} />
        );
      } else {
        buttonsDropdownInner.push(el);
      }
    });

    return {
      buttonsDropdown: buttonsDropdownInner,
      buttonsVisible: buttonsVisibleInner,
    };
  }, [
    active,
    buttons,
    running,
    selected,
    uuid,
    waiting,
  ]);

  const menuMemo = useMemo(() => menuGroups?.length >= 1 && (
    <FlexContainer
      alignItems="center"
      justifyContent="space-between"
    >
      {tabs?.length >= 1
        ? (
          <ButtonTabs
            onClickTab={(tab: TabType) => {
              setSelectedHeaderTab?.(tab);
            }}
            selectedTabUUID={selectedHeaderTab?.uuid}
            tabs={tabs}
            underlineColor={color?.accent}
            underlineStyle
          />
        )
        : <div />
      }

      {tabs?.length >= 1
        ? <FileEditorHeader defaultTextContent menuGroups={menuGroups} rightOffset={0} />
        : (
          <SubheaderMenuStyle>
            <FileEditorHeader defaultTextContent menuGroups={menuGroups} rightOffset={0} />
          </SubheaderMenuStyle>
        )
      }
    </FlexContainer>
  ), [
    color,
    menuGroups,
    selectedHeaderTab,
    setSelectedHeaderTab,
    tabs,
  ]);

  useEffect(() => {
    if (tabs?.length && !selectedHeaderTab) {
      setSelectedHeaderTab?.(tabs[0]);
    }
  }, []);

  return (
    <HeaderWrapperStyle
      ref={ref}
      style={{ position: 'relative' }}
      subheaderVisible={subheaderVisible}
    >
      <HeaderStyle>
        <FlexContainer alignItems="center">
          <KeyboardShortcutButton
            noBackground
            noPadding
            onClick={() => setSideMenuVisible(prev => !prev)}
            outline
            uuid={`KeyboardShortcutButton/${uuid}/header/menu/button`}
          >
            <Tooltip
              appearAfter
              block
              label="Open menu"
              size={UNIT * 3}
              widthFitContent
            >
              {sideMenuVisible
                ? <PanelCollapseLeft active size={UNIT * 3} />
                : <Menu fill={color?.accent} size={UNIT * 3} />
              }
            </Tooltip>
          </KeyboardShortcutButton>

          <Spacing mr={PADDING_UNITS} />

          {buttonsVisible}

          {waiting && (
            <>
              <Loading
                // color={color?.accent}
                // colorLight={color?.accentLight}
                loadingStyle={LoadingStyleEnum.BLOCKS}
              />

              <Spacing mr={PADDING_UNITS}/>
            </>
          )}
        </FlexContainer>

        <InfoStyle>
          <FlexContainer flexDirection="column">
            <FlexContainer alignItems="center" flexDirection="row" justifyContent="flex-end">
              {titleEls}
            </FlexContainer>

            {subtitle && (
              <Text monospace muted noWrapping xsmall>
                {subtitle}
              </Text>
            )}
          </FlexContainer>

          <Spacing mr={PADDING_UNITS} />

          <Tooltip
            appearBefore
            block
            label={(
              <FlexContainer alignItems="center">
                <Text inline monospace>
                  {LANGUAGE_DISPLAY_MAPPING[language]}
                </Text>

                <Spacing mr={1} />

                <Text color={color?.accent} inline monospace>
                  {BLOCK_TYPE_NAME_MAPPING[type]}
                </Text>
              </FlexContainer>
            )}
            size={null}
            widthFitContent
          >
            <Circle
              color={color?.accent}
              size={UNIT * 4}
              square
            >
              <Icon active size={ICON_SIZE} />
            </Circle>
          </Tooltip>
        </InfoStyle>
      </HeaderStyle>

      {menuGroups?.length >= 1 && (
        <SubheaderButtonStyle>
          <CSSTransition
            classNames="chevron-down"
            in
            timeout={400}
          >
            <KeyboardShortcutButton
              className="chevron-down-enter-done-visible"
              noBackground
              borderless
              noPadding
              onClick={() => {
                setSubheaderVisible(!subheaderVisible)
              }}
              uuid={`KeyboardShortcutButton/${uuid}/subheader/menu/button`}
            >
              <Spacing py={1}>
                {subheaderVisible && <ChevronUpV2 active size={UNIT * 2.5} />}
                {!subheaderVisible && <ChevronDownV2 fill={color?.accent} size={UNIT * 2.5} />}
              </Spacing>
            </KeyboardShortcutButton>
          </CSSTransition>
        </SubheaderButtonStyle>
      )}

      {running && (
        <div style={{ position: 'absolute', width: '100%' }}>
          <Loading
            // color={color?.accent}
            // colorLight={color?.accentLight}
            width="100%"
          />
        </div>
      )}

      {menuGroups?.length >= 1 && subheaderVisible && (
        <>
          <Divider light />

          <SubheaderStyle>
            {menuMemo}
          </SubheaderStyle>
        </>
      )}
    </HeaderWrapperStyle>
  );
}

export default React.forwardRef(CodeBlockHeader);
