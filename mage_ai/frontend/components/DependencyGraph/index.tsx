import Xarrow from 'react-xarrows';
import styled from 'styled-components';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import { UNIT } from '@oracle/styles/units/spacing';
import { getFinalLevelIndex } from './utils';
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

function DependencyGraph({
  pipeline,
  selectedBlock,
  setSelectedBlock,
}: DependencyGraphProps) {
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
      color: 'blue',
      end: endBlockUUID,
      start: startBlockUUID,
    }));

    return [...acc, ...arrowsToDownstreamBlocks];
  }, []);

  const nodeLevels: BlockType[][] = blocks.reduce((acc, block) => {
    const {
      downstream_blocks: downstreamBlocks,
    } = block;
    const finalLevelIndex = getFinalLevelIndex(downstreamBlocks, blockUUIDMapping);
    acc[finalLevelIndex] = [...(acc[finalLevelIndex] || []), block];

    return acc;
  }, []).reverse();
  // console.log('nodeLevels', nodeLevels);

  return (
    <ContainerStyle>
      {nodeLevels.map((nodeLevel, index) => (
        <Spacing key={index} mt={index*11} mr={6}>
          {nodeLevel.map((block) => {
            const { uuid, name, type } = block;
            
            return (
              <Button
                id={uuid}
                key={uuid}
                onClick={() => setSelectedBlock(block)}
              >
                {name}
              </Button>
            );
          })}
        </Spacing>
      ))}
      {arrows.map(({ color, end, start }) => (
        <Xarrow
          color={color}
          curveness={0.8}
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
