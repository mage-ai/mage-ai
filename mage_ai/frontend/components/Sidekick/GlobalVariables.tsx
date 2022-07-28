import { ThemeContext } from 'styled-components';
import { useContext, useMemo } from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Circle from '@oracle/elements/Circle';
import CodeBlock from '@oracle/components/CodeBlock';
import CopyToClipboard from '@oracle/components/CopyToClipboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { REGULAR_FONT_SIZE } from '@oracle/styles/fonts/sizes';
import { getColorsForBlockType } from 'components/CodeBlock/index.style';
import { indexBy } from '@utils/array';

const SAMPLE_SOURCE = `
    from mage_ai.data_preparation.variable_manager import (
        get_variable,
    )


    df = get_variable(
        'pipeline_uuid',
        'block_uuid',
        'variable_name',
    )
`;

const BUILD_CODE_SNIPPET_PREVIEW = (
  pipelineUUID: string,
  blockUUID: string,
  variableName: string,
) => `
    ${variableName} = get_variable('${pipelineUUID}', '${blockUUID}', '${variableName}')
`;

const BUILD_CODE_SNIPPET_COMPLETE = (
  pipelineUUID: string,
  blockUUID: string,
  variableName: string,
) => `from mage_ai.data_preparation.variable_manager import get_variable


${BUILD_CODE_SNIPPET_PREVIEW(pipelineUUID, blockUUID, variableName).trim()}
`;

type GlobalVariablesProps = {
  blockRefs?: {
    [current: string]: any;
  };
  blocks: BlockType[];
  globalVariables: PipelineVariableType[];
  setSelectedBlock: (block: BlockType) => void;
};

function GlobalVariables({
  blockRefs,
  blocks,
  globalVariables,
  setSelectedBlock,
}: GlobalVariablesProps) {
  const themeContext = useContext(ThemeContext);
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

  return (
    <Spacing p={PADDING_UNITS}>
      <Spacing mb={PADDING_UNITS}>
        <Text>
          The variables listed below can be used in any <Text
            bold
            inline
            monospace
          >
            {BlockTypeEnum.SCRATCHPAD}
          </Text> block.
        </Text>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Text>
          To load the variable, use the following syntax:
        </Text>
      </Spacing>

      <CodeBlock
        language="python"
        small
        source={SAMPLE_SOURCE}
      />

      {globalVariables?.map(({
        block: {
          uuid,
        },
        pipeline,
        variables,
      }: PipelineVariableType) => {
        const block: BlockType = blocksByUUID[uuid];

        if (!block || BlockTypeEnum.DATA_EXPORTER === block.type || BlockTypeEnum.SCRATCHPAD === block.type) {
          return;
        }

        const color = getColorsForBlockType(block.type, { theme: themeContext }).accent;
        const refBlock = blockRefs?.current?.[`${block.type}s/${uuid}.py`];

        return (
          <Spacing
            key={uuid}
            mt={8}
          >
            <FlexContainer alignItems="center">
              <Text>
                The following variables were defined in the block <Link
                  noHoverUnderline
                  preventDefault
                  onClick={() => {
                    setSelectedBlock(block);
                    refBlock?.current?.scrollIntoView?.();
                  }}
                >
                  <Text
                    color={color}
                    inline
                    monospace
                  >
                    {uuid}
                  </Text>
                </Link>:
              </Text>
            </FlexContainer>

            {variables?.map((variable: string) => (
              <Spacing
                key={`${uuid}-${variable}`}
                mt={2}
              >
                <CodeBlock
                  language="python"
                  small
                  source={BUILD_CODE_SNIPPET_PREVIEW(
                    pipeline.uuid,
                    uuid,
                    variable,
                  )}
                />
                <CopyToClipboard
                  copiedText={BUILD_CODE_SNIPPET_COMPLETE(
                    pipeline.uuid,
                    uuid,
                    variable,
                  )}
                  linkText="Copy code"
                  muted
                  small
                  withCopyIcon
                />
              </Spacing>
            ))}
          </Spacing>
        );
      })}
    </Spacing>
  );
}

export default GlobalVariables;
