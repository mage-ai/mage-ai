import { useMemo } from 'react';
import { useRouter } from 'next/router';

import BlocksStackedGradient from '@oracle/icons/custom/BlocksStackedGradient';
import ClientOnly from '@hocs/ClientOnly';
import GradientButton from '@oracle/elements/Button/GradientButton';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineV2Gradient from '@oracle/icons/custom/PipelineV2Gradient';
import SettingsGradient from '@oracle/icons/custom/SettingsGradient';
import TerminalGradient from '@oracle/icons/custom/TerminalGradient';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { BlocksStacked, PipelineV2, Settings, Terminal } from '@oracle/icons';
import { NavigationItemStyle } from './index.style';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const ICON_SIZE = 3 * UNIT;

export type NavigationItem = {
  Icon: any;
  IconSelected: any;
  id: string;
  isSelected?: (pathname: string) => boolean;
  label: () => string;
  linkProps: {
    as?: string;
    href: string;
  };
};

export type VerticalNavigationProps = {
  navigationItems?: NavigationItem[];
};

function VerticalNavigation({
  navigationItems,
}: VerticalNavigationProps) {
  const router = useRouter();
  const { pathname } = router;


  const buttons = useMemo(() => {
    const defaultItems = [
      {
        Icon: PipelineV2,
        IconSelected: PipelineV2Gradient,
        id: 'pipelines',
        label: () => 'Pipelines',
        linkProps: {
          href: '/pipelines',
        },
      },
      {
        Icon: BlocksStacked,
        IconSelected: BlocksStackedGradient,
        id: 'pipeline-runs',
        label: () => 'Pipelines runs',
        linkProps: {
          href: '/pipeline-runs',
        },
      },
      {
        Icon: Terminal,
        IconSelected: TerminalGradient,
        id: 'terminal',
        label: () => 'Terminal',
        linkProps: {
          href: '/terminal',
        },
      },
      {
        Icon: Settings,
        IconSelected: SettingsGradient,
        id: 'settings',
        label: () => 'Settings',
        linkProps: {
          href: '/settings',
        },
      },
    ];

    const items = navigationItems || defaultItems;

    return items.map(({
      Icon,
      IconSelected,
      id,
      isSelected,
      label,
      linkProps,
    }, idx: number) => {
      const selected: boolean = isSelected
        ? isSelected(pathname)
        : !!pathname.match(new RegExp(`^/${id}[/]*`));
      const IconToUse = (selected && IconSelected) ? IconSelected : Icon;

      return (
        <Spacing
          key={`button-${id}`}
          mt={idx >= 1 ? PADDING_UNITS : 0}
        >
          <Tooltip
            height={5 * UNIT}
            label={label()}
            size={null}
            widthFitContent
          >
            {(selected && IconSelected) && (
              <GradientButton
                backgroundGradient={PURPLE_BLUE}
                backgroundPanel
                basic
                borderWidth={2}
                linkProps={linkProps}
                paddingUnits={1}
              >
                <div
                  style={{
                    height: ICON_SIZE,
                    width: ICON_SIZE,
                  }}
                >
                  <IconToUse muted size={ICON_SIZE} />
                </div>
              </GradientButton>
            )}

            {!selected && (
              <KeyboardShortcutButton
                block
                noHoverUnderline
                noPadding
                linkProps={linkProps}
                sameColorAsText
                uuid={`VerticalNavigation/${id}`}
              >
                <NavigationItemStyle primary={!IconToUse}>
                  {IconToUse
                    ? <IconToUse muted size={ICON_SIZE} />
                    : <Text>Edit</Text>
                  }
                </NavigationItemStyle>
              </KeyboardShortcutButton>
            )}
          </Tooltip>
        </Spacing>
      );
    });
  }, [
    navigationItems,
    pathname,
  ]);


  return (
    <ClientOnly>
      {buttons}
    </ClientOnly>
  );
}

export default VerticalNavigation;
