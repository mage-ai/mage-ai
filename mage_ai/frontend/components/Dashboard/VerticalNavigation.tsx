import { useMemo } from 'react';
import { useRouter } from 'next/router';

import BlocksStackedGradient from '@oracle/icons/custom/BlocksStackedGradient';
import GradientButton from '@oracle/elements/Button/GradientButton';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineV2Gradient from '@oracle/icons/custom/PipelineV2Gradient';
import Spacing from '@oracle/elements/Spacing';
import { BlocksStacked, PipelineV2 } from '@oracle/icons';
import { PURPLE_BLUE } from '@oracle/styles/colors/gradients';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const ICON_SIZE = 3 * UNIT;

function VerticalNavigation() {
  const router = useRouter();
  const { pathname } = router;

  const buttons = useMemo(() => {
    return [
      {
        Icon: PipelineV2,
        IconSelected: PipelineV2Gradient,
        id: 'pipelines',
      },
      {
        Icon: BlocksStacked,
        IconSelected: BlocksStackedGradient,
        id: 'runs',
      },
    ].map(({
      Icon,
      IconSelected,
      id,
    }, idx: Number) => {
      const selected: boolean = pathname.match(new RegExp(`^/${id}[/]*`));
      const IconToUse = selected && IconSelected ? IconSelected : Icon;

      return (
        <Spacing
          key={`button-${id}`}
          mt={idx >= 1 ? PADDING_UNITS : 0}
        >
          {selected && (
            <GradientButton
              backgroundGradient={PURPLE_BLUE}
              backgroundPanel
              basic
              borderWidth={2}
              notClickable
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
              linkProps={{
                as: id,
                href: id,
              }}
              sameColorAsText
              uuid={`VerticalNavigation/${id}`}
            >
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: 1 * UNIT,
                }}
              >
                <IconToUse muted size={ICON_SIZE} />
              </div>
            </KeyboardShortcutButton>
          )}
        </Spacing>
      );
    });
  }, [pathname]);


  return (
    <>
      {buttons}
    </>
  );
}

export default VerticalNavigation;
