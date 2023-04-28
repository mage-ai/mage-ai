import NextLink from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/router';

import ClientOnly from '@hocs/ClientOnly';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GradientButton from '@oracle/elements/Button/GradientButton';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import {
  Lightning,
  PipelineV3,
  Schedule,
  Settings,
  Terminal,
} from '@oracle/icons';
import {
  NavigationItemStyle,
  NavigationLinkStyle,
} from './index.style';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const ICON_SIZE = 3 * UNIT;

export type NavigationItem = {
  Icon: any;
  IconSelected?: any;
  disabled?: boolean;
  id: string;
  isSelected?: (pathname: string, item: NavigationItem) => boolean;
  label: () => string;
  linkProps?: {
    as?: string;
    href: string;
  };
  onClick?: (e: any) => void;
};

export type VerticalNavigationProps = {
  aligned?: 'left' | 'right';
  navigationItems?: NavigationItem[];
  showMore?: boolean;
  visible?: boolean;
};

function VerticalNavigation({
  aligned,
  navigationItems,
  showMore,
  visible,
}: VerticalNavigationProps) {
  const router = useRouter();
  const { pathname } = router;

  const buttons = useMemo(() => {
    const defaultItems = [
      {
        Icon: PipelineV3,
        id: 'pipelines',
        label: () => 'Pipelines',
        linkProps: {
          href: '/pipelines',
        },
      },
      {
        Icon: Lightning,
        id: 'triggers',
        label: () => 'Triggers',
        linkProps: {
          href: '/triggers',
        },
      },
      {
        Icon: Schedule,
        id: 'pipeline-runs',
        label: () => 'Pipelines runs',
        linkProps: {
          href: '/pipeline-runs',
        },
      },
      {
        Icon: Terminal,
        id: 'terminal',
        label: () => 'Terminal',
        linkProps: {
          href: '/terminal',
        },
      },
      {
        Icon: Settings,
        id: 'settings',
        label: () => 'Settings',
        linkProps: {
          href: '/settings',
        },
      },
    ];

    const items = navigationItems || defaultItems;

    return items.map((item, idx: number) => {
      const {
        Icon,
        IconSelected,
        disabled,
        id,
        isSelected,
        label,
        linkProps,
        onClick,
      } = item;
      const selected: boolean = isSelected
        ? isSelected(pathname, item)
        : !!pathname.match(new RegExp(`^/${id}[/]*`));

      const IconToUse = (selected && IconSelected) ? IconSelected : Icon;
      const displayText = label();

      let buttonEl;
      let iconEl;

      const sharedNavigationItemProps = {
        primary: !IconToUse,
        selected: showMore && selected,
        showMore,
        withGradient: IconSelected,
      };

      if (selected && IconSelected) {
        iconEl = (
          <div
            style={{
              height: ICON_SIZE,
              width: ICON_SIZE,
            }}
          >
            <IconToUse muted size={ICON_SIZE} />
          </div>
        );

        if (showMore || visible) {
          iconEl = (
            <NavigationItemStyle {...sharedNavigationItemProps}>
              <IconToUse muted size={ICON_SIZE} />
            </NavigationItemStyle>
          );
        }

        buttonEl = (
          <GradientButton
            backgroundGradient={PURPLE_BLUE}
            backgroundPanel
            basic
            borderWidth={2}
            disabled={disabled}
            linkProps={linkProps}
            onClick={onClick}
            paddingUnits={1}
          >
            {iconEl}
          </GradientButton>
        );

        if (showMore) {
          buttonEl = iconEl;
        }
      } else if (!selected || (selected && !IconSelected)) {
        iconEl = (
          <NavigationItemStyle {...sharedNavigationItemProps}>
            {IconToUse
              ? <IconToUse
                muted={!selected}
                size={ICON_SIZE}
              />
              : <Text>Edit</Text>
            }
          </NavigationItemStyle>
        );

        buttonEl = (
          <KeyboardShortcutButton
            disabled={disabled}
            inline
            linkProps={linkProps}
            noHoverUnderline
            noPadding
            onClick={onClick}
            primary={selected}
            sameColorAsText
            uuid={`VerticalNavigation/${id}`}
          >
            {iconEl}
          </KeyboardShortcutButton>
        );

        if (showMore) {
          buttonEl = iconEl;
        }
      }

      let el;
      if ('right' === aligned) {
        el = (
          <FlexContainer
            alignItems="center"
            fullWidth
            justifyContent="flex-end"
          >
            <Flex flex={1} justifyContent="flex-end">
              <Text noWrapping>
                {displayText}
              </Text>
            </Flex>
            <Spacing mr={2} />
            {iconEl}
          </FlexContainer>
        );
      } else {
        el = (
          <FlexContainer alignItems="center">
            {iconEl}
            <Spacing mr={2} />
            <Flex flex={1}>
              <Text noWrapping>
                {displayText}
              </Text>
            </Flex>
          </FlexContainer>
        );
      }

      let clickEl = (
        <NavigationLinkStyle
          href="#"
          onClick={onClick}
          selected={selected}
        >
          {el}
        </NavigationLinkStyle>
      );
      if (linkProps) {
        clickEl = (
          <NextLink
            {...linkProps}
            passHref
          >
            {clickEl}
          </NextLink>
        );
      }

      if ('right' === aligned) {
        buttonEl = (
          <FlexContainer
            alignItems="center"
            fullWidth
            justifyContent="flex-end"
          >
            {buttonEl}
          </FlexContainer>
        );
      }

      let finalEl;

      if (visible) {
        finalEl = clickEl;
      } else if (showMore) {
        finalEl = buttonEl;
      } else {
        finalEl = (
          <Tooltip
            appearBefore={'right' === aligned}
            height={5 * UNIT}
            label={displayText}
            size={null}
            widthFitContent
          >
            {buttonEl}
          </Tooltip>
        );
      }

      return (
        <Spacing
          key={`button-${id}`}
          mt={showMore && visible
            ? 0
            : idx >= 1 ? PADDING_UNITS : 0
          }
        >
          {finalEl}
        </Spacing>
      );
    });
  }, [
    aligned,
    navigationItems,
    pathname,
    showMore,
    visible,
  ]);

  return (
    <ClientOnly>
      {buttons}
    </ClientOnly>
  );
}

export default VerticalNavigation;
