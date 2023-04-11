import { useMemo, useContext } from 'react';
import { ThemeContext } from 'styled-components';

import BlockType from '@interfaces/BlockType';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

type BlocksInPipelineProps = {
  hiddenBlocks: {
    [uuid: string]: BlockType;
  };
  pipeline: PipelineType;
  setHiddenBlocks: ((opts: {
    [uuid: string]: BlockType;
  }) => {
    [uuid: string]: BlockType;
  });
};

function BlocksInPipeline({
  hiddenBlocks,
  pipeline,
  setHiddenBlocks,
}: BlocksInPipelineProps) {
  const themeContext = useContext(ThemeContext);

  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  const {
    blocksHidden,
    blocksVisible,
  } = useMemo(() => {
    const h = [];
    const v = [];

    blocks.forEach((b) => {
      const { uuid } = b;

      if (!!hiddenBlocks?.[uuid]) {
        h.push(b);
      } else {
        v.push(b);
      }
    });

    return {
      blocksHidden: h,
      blocksVisible: v,
    };
  }, [
    blocks,
    hiddenBlocks,
  ]);
  const allBlocksHidden = useMemo(() => blocks?.length >= 1 && blocksVisible.length === 0, [
    blocks,
    blocksVisible,
  ]);
  const allBlocksVisible = useMemo(() => blocks?.length >= 1 && blocksHidden.length === 0, [
    blocks,
    blocksHidden,
  ]);

  return (
    <>
      <Spacing p={1}>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex flex={1} justifyContent="center">
            <Checkbox
              checked={allBlocksVisible}
              label="Show all"
              onClick={() => setHiddenBlocks(() => ({}))}
            />
          </Flex>
          <Flex flex={1} justifyContent="center">
            <Checkbox
              checked={allBlocksHidden}
              label="Hide all"
              onClick={() => setHiddenBlocks(() => blocks.reduce((acc, { uuid }) => ({
                ...acc,
                [uuid]: true,
              }), {}))}
            />
          </Flex>
        </FlexContainer>
      </Spacing>

      <Divider medium />

      {blocks?.map((block) => {
        const {
          uuid,
        } = block;
        const color = getColorsForBlockType(
          block.type,
          { blockColor: block.color, theme: themeContext },
        ).accent;
        const visible = !hiddenBlocks?.[uuid];

        return (
          <Link
            block
            key={uuid}
            noHoverUnderline
            noOutline
            // @ts-ignore
            onClick={() => setHiddenBlocks(prev => ({
              ...prev,
              [uuid]: visible,
            }))}
            preventDefault
          >
            <Spacing mt={1} px={1}>
              <FlexContainer
                alignItems="center"
              >
                <Spacing pr={1}>
                  <Checkbox
                    checked={visible}
                  />
                </Spacing>

                <Flex alignItems="center">
                  <Circle
                    color={color}
                    size={UNIT * 1.5}
                    square
                  />

                  <Spacing mr={1} />

                  <Text default monospace noWrapping small>
                    {uuid}
                  </Text>
                </Flex>
              </FlexContainer>
            </Spacing>
          </Link>
        );
      })}
    </>
  );
}

export default BlocksInPipeline;
