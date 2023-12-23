import { useContext } from 'react';
import { ThemeContext } from 'styled-components';

import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import { BlocksStacked } from '@oracle/icons';
import {
  ICON_SIZE,
  IconStyle,
  NavLinkStyle,
} from '../index.style';
import {
  NavLinkType,
} from '../constants';

type BlockNavigationProps = {
  navLinks: NavLinkType[];
  selectedLink?: NavLinkType;
  setSelectedLink: (navLink: NavLinkType) => void;
};

function BlockNavigation({
  navLinks,
  selectedLink,
  setSelectedLink,
}: BlockNavigationProps) {
  const themeContext = useContext(ThemeContext);

  return (
    <>
      {navLinks.map((navLink: NavLinkType) => {
        const {
          Icon,
          description,
          label,
          selectedBackgroundColor,
          selectedIconProps,
          uuid,
        } = navLink;
        const isSelected = selectedLink?.uuid === uuid;
        const IconProps = {
          size: ICON_SIZE,
          ...(isSelected && selectedIconProps ? selectedIconProps : {}),
        };

        return (
          <NavLinkStyle
            key={uuid}
            onClick={() => setSelectedLink(navLink)}
            selected={isSelected}
          >
            <FlexContainer alignItems="center">
              {Icon && (
                <IconStyle
                  backgroundColor={isSelected && selectedBackgroundColor
                    ? selectedBackgroundColor(themeContext)
                    : null
                  }
                >
                  <Icon {...IconProps} />
                </IconStyle>
              )}

              <FlexContainer alignItems="flex-start" flexDirection="column" justifyContent="center">
                <Text bold large>
                  {label ? label() : uuid}
                </Text>

                {description && (
                  <Text muted small>
                    {description?.()}
                  </Text>
                )}
              </FlexContainer>
            </FlexContainer>
          </NavLinkStyle>
        );
      })}
    </>
  );
}

export default BlockNavigation;
