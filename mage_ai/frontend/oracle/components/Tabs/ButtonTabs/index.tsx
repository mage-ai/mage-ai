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
  icon?: any;
  index?: number;
  label?: () => string | any;
  uuid: string;
};

type ButtonTabsProps = {
  allowScroll?: boolean;
  compact?: boolean;
  contained?: boolean;
  large?: boolean;
  noPadding?: boolean;
  onClickTab: (tab: TabType) => void;
  regularSizeText?: boolean;
  selectedTabUUID?: string;
  selectedTabUUIDs?: {
    [tabUUID: string]: TabType;
  };
  showScrollbar?: boolean;
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
  selectedTabUUIDs,
  showScrollbar,
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
        icon,
        label,
        uuid,
      } = tab;
      const selected = selectedTabUUIDs ? uuid in selectedTabUUIDs : uuid === selectedTabUUID;
      const IconToUse = selected ? (IconSelected || Icon) : Icon;
      let iconEl;
      if (icon) {
        iconEl = React.cloneElement(icon, {
          ...icon.props,
          size: 2 * UNIT,
        });
      } else {
        const IconToUse = selected ? (IconSelected || Icon) : Icon;
        if (IconToUse) {
          iconEl = (
            <IconToUse
              default={!selected}
              size={2 * UNIT}
            />
          );
        }
      }

      const displayText = label ? label() : uuid;
      const el = (
        <FlexContainer alignItems="center">
          {iconEl && (
            <>
              {iconEl}

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
      showScrollbar={showScrollbar}
    >
      {el}
    </TabsContainerStyle>
  );
}

export default React.forwardRef(ButtonTabs);
