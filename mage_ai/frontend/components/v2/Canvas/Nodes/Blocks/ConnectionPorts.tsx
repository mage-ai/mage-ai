import Section from '@mana/elements/Section';
import { CIRCLE_PORT_SIZE } from './constants';
import Text from '@mana/elements/Text';
import Circle from '@mana/elements/Circle';
import Grid from '@mana/components/Grid';
import { getBlockColor } from '@mana/themes/blocks';
import BlockType from '@interfaces/BlockType';

export default function ConnectionPorts({
  block,
  dragControlsUp,
  dragControlsDn,
}: {
  block: BlockType
  dragControlsUp?: any;
  dragControlsDn?: any;
}) {
  const color = getBlockColor(block.type, { getColorName: true })?.names?.base;

  function startDrag(event: any, controls: any) {
    event.preventDefault();
    event.stopPropagation();

    controls(event);
  }

  const sharedProps = {
    backgroundColor: color,
    borderColor: color,
    hoverBorderColor: true,
    hoverBackgroundColor: true,
    motion: {
      drag: false,
      whileHover: {
        scale: 1.2,
      },
    },
    size: CIRCLE_PORT_SIZE,
    style: {
      cursor: 'grab',
    },
  };

  return (
    <Section small withBackground>
      <Grid
        columnGap={16} alignItems="center" justifyContent="space-between" templateColumns="auto 1fr auto" templateRows="1fr"
        paddingLeft={4}
        paddingRight={4}
        paddingTop={3}
        paddingBottom={3}
      >
        <Circle
          {...sharedProps}
          motion={{
            ...sharedProps.motion,
            onPointerDown: event => startDrag(event, dragControlsUp),
          }}
        />

        <Grid justifyContent="center" alignItems="center">
          <Text muted small>
            Drag to update dependencies
          </Text>
        </Grid>

        <Circle
          {...sharedProps}
          motion={{
            ...sharedProps.motion,
            onPointerDown: event => startDrag(event, dragControlsDn),
          }}
        />
      </Grid>
    </Section>
  );
}
