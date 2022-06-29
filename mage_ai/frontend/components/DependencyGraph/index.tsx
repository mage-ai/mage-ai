import Xarrow from 'react-xarrows';
import styled from 'styled-components';
import { ThemeContext } from 'styled-components';
import { useContext } from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getFinalLevelIndex, getNodeColor } from './utils';
import { indexBy } from '@utils/array';

export type DependencyGraphProps = {
  pipeline: PipelineType;
  selectedBlock: BlockType;
  setSelectedBlock: (block: BlockType) => void;
};

const ContainerStyle = styled.div`
  display: flex;
  flex: 1;
  padding: ${UNIT * 2}px;
  width: 100%;
  overflow: auto;
`;

const INVERTED_TEXT_COLOR_BLOCK_TYPES = [
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.TRANSFORMER,
];

function DependencyGraph({
  pipeline,
  selectedBlock,
  setSelectedBlock,
}: DependencyGraphProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const blocks = pipeline?.blocks || [];
  const blockUUIDMapping = indexBy(blocks, ({ uuid }) => uuid);

  const arrows: {
    color: string;
    end: string;
    start: string;
  }[] = blocks.reduce((acc, block) => {
    const {
      downstream_blocks: downstreamBlocks,
      type,
      uuid: startBlockUUID,
    } = block;
    const arrowsToDownstreamBlocks = downstreamBlocks.map(endBlockUUID => ({
      color: getNodeColor(type, themeContext),
      end: endBlockUUID,
      start: startBlockUUID,
    }));

    return [...acc, ...arrowsToDownstreamBlocks];
  }, []);

  const nodeLevels: BlockType[][] = blocks.reduce((acc, block) => {
    const {
      upstream_blocks: upstreamBlocks,
    } = block;
    const finalLevelIndex = getFinalLevelIndex(upstreamBlocks, blockUUIDMapping);
    acc[finalLevelIndex] = [...(acc[finalLevelIndex] || []), block];

    return acc;
  }, []);

  return (
    <ContainerStyle>
      {nodeLevels.map((nodeLevel, index) => (
        <FlexContainer alignItems="center" key={index}>
          <Spacing mr={6}>
            {nodeLevel.map((block) => {
              const { uuid, name, type } = block;
              const nodeColor = getNodeColor(type, themeContext);

              return (
                <Spacing key={uuid} py={1}>
                  <Button
                    backgroundColor={nodeColor}
                    id={uuid}
                    onClick={() => setSelectedBlock(block)}
                    selectedAlt={selectedBlock?.uuid === uuid}
                    smallBorderRadius
                  >
                    <Text
                      inverted={INVERTED_TEXT_COLOR_BLOCK_TYPES.includes(type)}
                      monospace
                      small
                    >
                      {name}
                    </Text>
                  </Button>
                </Spacing>
              );
            })}
          </Spacing>
        </FlexContainer>
      ))}
      {arrows.map(({ color, end, start }) => (
        <Xarrow
          animateDrawing={0.2}
          color={color}
          curveness={0.6}
          dashness={false}
          end={end}
          headSize={5}
          key={`${start}_${end}`}
          start={start}
          strokeWidth={1}
        />
      ))}
    </ContainerStyle>
  );
}

export default DependencyGraph;
