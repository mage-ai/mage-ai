import NextLink from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';

import ClientOnly from '@hocs/ClientOnly';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import GradientButton from '@oracle/elements/Button/GradientButton';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api'
import useProject from '@utils/models/project/useProject';
import {
  BranchAlt,
  Insights,
  DocumentIcon,
  Lightning,
  NavDashboard,
  PipelineV3,
  Schedule,
  Settings,
  HexagonAll,
  TemplateShapes,
  Terminal,
  TripleBoxes,
} from '@oracle/icons';
import {
  NavigationItemStyle,
  NavigationLinkStyle,
} from './index.style';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { pushAtIndex } from '@utils/array';

const ICON_SIZE = 3 * UNIT;
const DEFAULT_NAV_ITEMS = ({
  featureEnabled,
  project,
  projectPlatformActivated,
}: {
  featureEnabled: (featureUUID: FeatureUUIDEnum) => boolean;
  project?: ProjectType;
  projectPlatformActivated?: boolean;
}) => {
  let miscItems = [
    {
      Icon: DocumentIcon,
      id: 'files',
      label: () => 'Files',
      linkProps: {
        href: '/files',
      },
    },
    {
      Icon: TemplateShapes,
      id: 'templates',
      label: () => 'Templates',
      linkProps: {
        href: '/templates',
      },
    },
    {
      Icon: BranchAlt,
      id: 'version-control',
      label: () => 'Version control',
      linkProps: {
        href: '/version-control',
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

  return [
    {
      id: 'main',
      items: [
        {
          Icon: NavDashboard,
          id: 'overview',
          label: () => 'Overview',
          linkProps: {
            href: '/overview',
          },
        },
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
          label: () => 'Pipeline runs',
          linkProps: {
            href: '/pipeline-runs',
          },
        },
        {
          Icon: HexagonAll,
          id: 'global-data-products',
          label: () => 'Global data products',
          linkProps: {
            href: '/global-data-products',
          },
        },
      ],
    },
    {
      id: 'misc',
      items: miscItems,
    },
  ];
};

export type NavigationItem = {
  Icon?: any;
  IconSelected?: any;
  disabled?: boolean;
  id: string;
  isSelected?: (pathname: string, item: NavigationItem) => boolean;
  items?: NavigationItem[];
  label?: () => string;
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

  const {
    featureEnabled,
    project,
    projectPlatformActivated,
  } = useProject();
  const defaultNavItems = useMemo(() => DEFAULT_NAV_ITEMS({
    featureEnabled,
    project,
    projectPlatformActivated,
  }), [
    project,
  ]);

  const buildItem = useCallback((item, idx: number) => {
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
    const displayText = label?.();

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
        data-testid="navigation_link"
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
  }, [
    aligned,
    pathname,
    showMore,
    visible,
  ]);

  const buttons = useMemo(() => {
    const arr = [];
    (navigationItems || defaultNavItems).forEach((item, idx: number) => {
      const { id, items } = item;

      if (items?.length >= 1) {
        if (idx >= 1) {
          arr.push(
            <Spacing
              key={id}
              my={visible ? PADDING_UNITS : PADDING_UNITS + 1}
            >
              <Divider light />
            </Spacing>,
          );
        }

        arr.push(...items.map((item2, idx2: number) => buildItem(item2, idx2)));
      } else {
        arr.push(buildItem(item, idx));
      }
    });

    return arr;
  }, [
    buildItem,
    defaultNavItems,
    navigationItems,
    visible,
  ]);

  return (
    <ClientOnly>
      {buttons}
    </ClientOnly>
  );
}

export default VerticalNavigation;
