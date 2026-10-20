import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link, { LinkProps } from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import TabEl, { TabArgsProps } from './Tab';
import Text from '@oracle/elements/Text';
import light from '@oracle/styles/themes/light';
import { FONT_FAMILY_BOLD } from '@oracle/styles/fonts/primary';
import { UNIT, PADDING_UNITS } from '@oracle/styles/units/spacing';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';

export const TAB_URL_PARAM = 'tab';

export type TabsProps = {
  actionEl?: JSX.Element;
  active?: boolean;
  bold?: boolean;
  children: any;
  containerWidthPercentage?: number;
  currentTab?: string;
  defaultKey?: string;
  fullWidth?: boolean;
  large?: boolean;
  noBottomBorder?: boolean;
  onChange?: any;
};

const TabHeaderContainerStyle = styled.div<TabsProps>`
  ${props => props.containerWidthPercentage && `
    width: ${props.containerWidthPercentage}%;
  `}
`;

const TabHeader = styled.div<TabsProps>`
  border-top-left-radius: ${BORDER_RADIUS_SMALL}px;
  border-top-right-radius: ${BORDER_RADIUS_SMALL}px;
  margin-right: ${UNIT * 6}px;
  position: relative;
  z-index: 2;

  ${props => props.noBottomBorder && `
    border-bottom: none;
  `}

  ${props => props.active && `
    border-bottom: ${PADDING_UNITS}px solid;
    border-color: ${(props.theme.interactive || light.interactive).linkPrimary};
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

const LinkStyle = styled.div<LinkProps>`
  align-items: center;
  display: flex;

  ${props => props.bold && `
    font-family: ${FONT_FAMILY_BOLD};
  `}

  ${props => props.fullWidth && `
    justify-content: center;
  `}

  ${props => !props.disabled && `
    &:hover {
      path {
        fill: ${(props.theme.content || light.interactive).linkPrimary} !important;
      }
    }
  `}
`;

function Tabs({
  actionEl,
  bold,
  children: childrenArg,
  containerWidthPercentage,
  currentTab: currentTabProp,
  defaultKey,
  fullWidth,
  large,
  noBottomBorder,
  onChange,
}: TabsProps) {
  const children = Array.isArray(childrenArg) ? childrenArg.filter(x => !!x) : [childrenArg];
  const tabKeys = React.Children.map(children, tab => tab.key);
  const [currentTabState, setCurrentTab] = useState(defaultKey || tabKeys[0]);
  const currentTab = currentTabProp || currentTabState;

  useEffect(() => {
    setCurrentTab(defaultKey);
  }, [defaultKey]);

  return (
    <>
      <TabHeaderContainerStyle containerWidthPercentage={containerWidthPercentage}>
        <FlexContainer justifyContent={fullWidth ? 'center' : null}>
          {actionEl &&
            <Flex flex="1">
              {actionEl}
            </Flex>
          }
          {React.Children.map(children, ({ key, props }: TabArgsProps) => {
            const active: boolean = currentTab === key;
            const childProps = {
              default: !active,
              disabled: props.disabled,
              size: UNIT * 2,
            };

            return (
              <Flex flex={fullWidth ? '1' : null} key={key}>
                <Link
                  block
                  default={!active}
                  disabled={props.disabled}
                  flex={1}
                  large={large}
                  noHoverUnderline
                  noOutline
                  onClick={() => {
                    if (onChange) {
                      onChange(key);
                    }
                    setCurrentTab(key);
                  }}
                  preventDefault
                  sameColorAsText={active}
                >
                  <TabHeader
                    active={active}
                    fullWidth={fullWidth}
                    noBottomBorder={noBottomBorder}
                  >
                    <LinkStyle
                      bold={bold && active}
                      disabled={props.disabled}
                      fullWidth={fullWidth}
                      large={large}
                    >
                      {props.beforeChildren && React.cloneElement(props.beforeChildren, childProps)}

                      <Spacing
                        ml={props.beforeChildren ? 1 : 0}
                        mr={props.afterChildren ? 1 : 0}
                      >
                        <Text bold={bold} large={large}>
                          {props.label}
                        </Text>
                      </Spacing>

                      {props.afterChildren && React.cloneElement(props.afterChildren, childProps)}
                    </LinkStyle>
                  </TabHeader>
                </Link>
              </Flex>
            );
          })}
        </FlexContainer>
      </TabHeaderContainerStyle>

      {children.filter(c => c.key === currentTab)}
    </>
  );
}

Tabs.propTypes = {
  bold: PropTypes.bool,
  children: PropTypes.node.isRequired,
  containerWidthPercentage: PropTypes.number,
  defaultKey: PropTypes.string,
  fullWidth: PropTypes.bool,
  noBottomBorder: PropTypes.bool,
  onChange: PropTypes.func,
};

export const Tab = TabEl;
export default Tabs;
