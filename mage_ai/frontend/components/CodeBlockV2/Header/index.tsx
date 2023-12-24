import * as osPath from 'path';
import { CSSTransition } from 'react-transition-group';
import { useMemo, useState } from 'react';

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
  SubheaderButtonStyle,
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
  setSideMenuVisible,
  sideMenuVisible,
  subtitle,
  theme,
  title,
}: CodeBlockHeaderProps & {
  sideMenuVisible?: boolean;
  setSideMenuVisible?: (value: boolean) => void;
}) {
  console.log('CodeBlockHeader RENDERRRRRRRRRRRRRRRR');

  const [subheaderVisible, setSubheaderVisible] = useState(false);

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

  const {
    color: blockColor,
    language,
    type,
    uuid,
  } = block;

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
            <Text muted>
              /
            </Text>
          </div>
        );
      }

      arr.push(
        <Text key={part} default={idx < titlePartsCount - 1} weightStyle={4}>
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
          bold
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
          onClick={onClick}
          outline
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
          <Spacing key={`spacing/${uuid}/${uuidButton}/${idx}`} mr={PADDING_UNITS} />
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
    <FileEditorHeader
      menuGroups={menuGroups}
    />
  ), [
    menuGroups,
  ]);

  return (
    <HeaderWrapperStyle style={{ position: 'relative' }}>
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
              size={ICON_SIZE}
              widthFitContent
            >
              {sideMenuVisible
                ? <PanelCollapseLeft active size={ICON_SIZE} />
                : <Menu fill={color?.accent} size={ICON_SIZE} />
              }
            </Tooltip>
          </KeyboardShortcutButton>

          <Spacing mr={PADDING_UNITS} />

          {buttonsVisible}

          {waiting && (
            <>
              <Loading
                color={color?.accent}
                colorLight={color?.accentLight}
                loadingStyle={LoadingStyleEnum.BLOCKS}
              />

              <Spacing mr={PADDING_UNITS}/>
            </>
          )}
        </FlexContainer>

        <FlexContainer alignItems="center">
          <FlexContainer flexDirection="column">
            <FlexContainer alignItems="center" flexDirection="row" justifyContent="flex-end">
              {titleEls}
            </FlexContainer>

            {subtitle && (
              <Text default monospace small>
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
              size={UNIT * 5}
              square
            >
              <Icon active size={ICON_SIZE} />
            </Circle>
          </Tooltip>
        </FlexContainer>
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
              {subheaderVisible && <ChevronUpV2 active size={ICON_SIZE} />}
              {!subheaderVisible && <ChevronDownV2 fill={color?.accent} size={ICON_SIZE} />}
            </KeyboardShortcutButton>
          </CSSTransition>
        </SubheaderButtonStyle>
      )}

      {running && (
        <div style={{ position: 'absolute', width: '100%' }}>
          <Loading
            color={color?.accent}
            colorLight={color?.accentLight}
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

export default CodeBlockHeader;
