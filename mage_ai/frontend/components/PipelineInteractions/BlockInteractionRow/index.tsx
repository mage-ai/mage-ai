import BlockInteractionController from '@components/Interactions/BlockInteractionController';
import BlockType from '@interfaces/BlockType';
import Divider from '@oracle/elements/Divider';
import Headline from '@oracle/elements/Headline';
import InteractionType from '@interfaces/InteractionType';
import Spacing from '@oracle/elements/Spacing';
import { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import { ContainerStyle } from '../index.style';
import { PADDING_UNITS, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';

export type BlockInteractionWithInteraction = {
  blockInteraction: BlockInteractionType;
  interaction: InteractionType;
};

type BlockInteractionRowProps = {
  block: BlockType;
  blockInteractionWithInteractions: BlockInteractionWithInteraction[];
};

function BlockInteractionRow({
  block,
  blockInteractionWithInteractions,
}: BlockInteractionRowProps) {
  const {
    color: borderColor,
    name: blockName,
    type: blockType,
  } = block;

  return (
    <ContainerStyle
      // borderColor={borderColor}
      // blockType={blockType}
    >
      <Spacing p={PADDING_UNITS}>
        <Headline bold default monospace>
          {blockName}
        </Headline>
      </Spacing>

      <Divider light />

      <Spacing p={PADDING_UNITS}>
        {blockInteractionWithInteractions?.map(({
          blockInteraction,
          interaction,
        }: BlockInteractionWithInteraction, idx: number) => (
          <Spacing mt={idx >= 1 ? UNITS_BETWEEN_SECTIONS : 0}>
            <BlockInteractionController
              blockInteraction={blockInteraction}
              interaction={interaction}
              key={blockInteraction?.name}
            />
          </Spacing>
        ))}
      </Spacing>
    </ContainerStyle>
  );
}

export default BlockInteractionRow;
