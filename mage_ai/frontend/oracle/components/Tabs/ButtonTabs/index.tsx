import React, { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import GradientButton from '@oracle/elements/Button/GradientButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { SelectedUnderlineStyle, TabsContainerStyle, UNDERLINE_HEIGHT } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { pauseEvent } from '@utils/events';

export type TabType = {
  Icon?: any;
  IconSelected?: any;
  label?: () => string | any;
  uuid: string;
};

type ButtonTabsProps = {
  allowScroll?: boolean;
  compact?: boolean;
  contained?: boolean;
  noPadding?: boolean;
  onClickTab: (tab: TabType) => void;
  regularSizeText?: boolean;
  selectedTabUUID?: string;
  small?: boolean;
  tabs: TabType[];
  underlineColor?: string;
  underlineStyle?: boolean;
  uppercase?: boolean;
};

function ButtonTabs({
  allowScroll,
  compact,
  contained,
  large,
  noPadding,
  onClickTab,
  regularSizeText,
  selectedTabUUID,
  small,
  tabs,
  underlineColor,
  underlineStyle,
  uppercase = true,
}: ButtonTabsProps, ref) {
  const tabEls = useMemo(() => {
    const tabCount: number = tabs.length;
    const arr = [];

    tabs.forEach((tab: TabType, idx: number) => {
      const {
        Icon,
        IconSelected,
        label,
        uuid,
      } = tab;
      const selected = uuid === selectedTabUUID;
      const IconToUse = selected ? (IconSelected || Icon) : Icon;
      const displayText = label ? label() : uuid;
      const el = (
        <FlexContainer alignItems="center">
          {IconToUse && (
            <>
              <IconToUse
                default={!selected}
                size={2 * UNIT}
              />
              <Spacing mr={1} />
            </>
          )}

          <Text
            bold
            default={!selected}
            noWrapping
            small={!regularSizeText && !large}
            uppercase={uppercase}
          >
            {displayText}
          </Text>
        </FlexContainer>
      );

      if (idx >= 1 && tabCount >= 2) {
        arr.push(
          <div
            key={`spacing-${uuid}`}
            style={{ marginLeft: ((regularSizeText || large) ? 2 : 1.5) * UNIT }}
          />,
        );
      }

      if (selected && !underlineStyle) {
        arr.push(
          <GradientButton
            backgroundGradient={PURPLE_BLUE}
            backgroundPanel
            borderLess
            borderWidth={2}
            compact={compact || small}
            key={uuid}
            onClick={(e) => {
              pauseEvent(e);
              onClickTab(tab);
            }}
            paddingUnitsHorizontal={1.75}
            paddingUnitsVertical={1.25}
            small={small}
          >
            {el}
          </GradientButton>,
        );
      } else {
        arr.push(
          <FlexContainer
            flexDirection="column"
            key={`button-tab-${uuid}`}
            style={{
              paddingLeft: 2,
              paddingRight: 2,
              paddingBottom: underlineStyle ? 0 : 2,
              paddingTop: underlineStyle ? 0 : 2,
            }}
          >
            <Button
              borderLess
              compact={compact || small}
              default
              noBackground={underlineStyle}
              noPadding={underlineStyle}
              onClick={(e) => {
                pauseEvent(e);
                onClickTab(tab);
              }}
              outline={!underlineStyle}
              small={small}
            >
              {!underlineStyle && el}
              {underlineStyle && (
                <div
                  style={{
                    paddingBottom: ((compact || small) ? UNIT / 2 : UNIT) + 2,
                    paddingTop: ((compact || small) ? UNIT / 2 : UNIT) + 2 + UNDERLINE_HEIGHT,
                  }}
                >
                  {el}
                </div>
              )}
            </Button>

            {underlineStyle && (
              <SelectedUnderlineStyle
                backgroundColor={underlineColor}
                selected={selected}
              />
            )}
          </FlexContainer>,
        );
      }
    });

    return arr;
  }, [
    compact,
    onClickTab,
    selectedTabUUID,
    small,
    tabs,
    underlineStyle,
  ]);

  const el = (
    <FlexContainer alignItems="center">
      {tabEls}
    </FlexContainer>
  );

  if (contained) {
    return el;
  }

  return (
    <TabsContainerStyle
      allowScroll={allowScroll}
      noPadding={noPadding}
      ref={ref}
    >
      {el}
    </TabsContainerStyle>
  );
}

export default React.forwardRef(ButtonTabs);
