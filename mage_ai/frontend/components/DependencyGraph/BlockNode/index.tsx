import { ThemeContext } from 'styled-components';
import { useContext, useMemo } from 'react';

import Badge from '@oracle/components/Badge';
import BlockType from '@interfaces/BlockType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { BlocksStacked } from '@oracle/icons';
import {
  BadgeSpacingBetweenStyle,
  BodyStyle,
  HeaderStyle,
  IconStyle,
  NodeStyle,
} from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildTags } from '@components/CodeBlock/utils';
import {
  blockTagsText,
  getBlockHeaderSubtitle,
  getBlockHeaderText,
} from './utils';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

type BlockNodeProps = {
  block: BlockType;
  callbackBlocks?: BlockType[];
  conditionalBlocks?: BlockType[];
  extensionBlocks?: BlockType[];
  height: number;
  isConditionFailed?: boolean;
  pipeline: PipelineType;
};

function BlockNode({
  block,
  callbackBlocks,
  conditionalBlocks,
  extensionBlocks,
  height,
  isConditionFailed,
  pipeline,
}: BlockNodeProps) {
  const themeContext: ThemeType = useContext(ThemeContext);

  const {
    color,
    language,
    type,
    uuid,
  } = block;
  const {
    accent,
    accentLight,
  } = getColorsForBlockType(
    type,
    {
      blockColor: color,
      theme: themeContext,
    },
  );

  const tags = buildTags(
    block,
    {
      conditionFailed: isConditionFailed,
    },
  );

  return (
    <NodeStyle
      borderColor={accent}
      height={height}
    >
      <HeaderStyle>
        <FlexContainer alignItems="center">
          <IconStyle
            borderColor={accent}
          >
            <BlocksStacked size={UNIT * 3} />
          </IconStyle>

          <Spacing mr={2} />

          <Flex flexDirection="column">
            <Text bold monospace>
              {getBlockHeaderText(block, pipeline)}
            </Text>
            <Text default monospace small>
              {getBlockHeaderSubtitle(block, pipeline)}
            </Text>
          </Flex>
        </FlexContainer>
      </HeaderStyle>

      <BodyStyle>
        {tags?.length >= 1 && (
          <Spacing my={1}>
            <Text default monospace small>
              {blockTagsText(block)}
            </Text>
          </Spacing>
        )}

        {/* This is in a specific order */}
        {[
          conditionalBlocks,
          callbackBlocks,
          extensionBlocks,
        ].map((blocks, idx) => {
          if (blocks?.length >= 1) {
            return (
              <Spacing key={`badge-blocks-${idx}`} my={1}>
                <FlexContainer alignItems="center">
                  {blocks.reduce((acc, b, idx) => {
                    if (idx >= 1) {
                      acc.push(
                        <div key={`space-${b.uuid}`}>
                          &nbsp;
                        </div>,
                      );
                    }

                    acc.push(
                      <Badge
                        color={getColorsForBlockType(
                          b.type,
                          {
                            blockColor: b.color,
                            theme: themeContext,
                          },
                        ).accentLight}
                        key={`badge-${b.uuid}`}
                        monospace
                        xxsmall
                      >
                        {b.uuid}
                      </Badge>,
                    );

                    return acc;
                  }, [])}
                </FlexContainer>
              </Spacing>
            );
          }

          return;
        })}
      </BodyStyle>
    </NodeStyle>
  );
}

export default BlockNode;
