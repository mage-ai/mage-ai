import {
  useMemo,
  useState,
} from 'react';

import BlockType, {
  BlockTypeEnum,
  CHART_TYPES,
  ChartTypeEnum,
} from '@interfaces/BlockType';
import CodeEditor from '@components/CodeEditor';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { CONFIGURATIONS_BY_CHART_TYPE } from './constants';
import {
  ChartBlockStyle,
  CodeContainerStyle,
  CodeStyle,
  ConfigurationOptionsStyle,
} from './index.style';
import { Edit } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';

type ChartBlockType = {
  block: BlockType;
  blocks: BlockType[];
  onChangeContent: (value: string) => void;
};

function ChartBlock({
  block,
  blocks,
  onChangeContent,
}: ChartBlockType) {
  const {
    configuration = {},
    upstream_blocks: upstreamBlocks = [],
  } = block;
  const [chartType, setChartType] = useState<ChartTypeEnum>(configuration.chart_type);
  const [content, setContent] = useState<string>(block.content);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [sourceBlockUUID, setSourceBlockUUID] = useState<string>(upstreamBlocks?.[0]);

  const configurationOptions = CONFIGURATIONS_BY_CHART_TYPE[chartType];
  const blocksOfType = useMemo(() => blocks?.filter(({
    type,
  }: BlockType) => [BlockTypeEnum.DATA_LOADER, BlockTypeEnum.TRANSFORMER].includes(type),
  ), [
    blocks,
  ]);

  const codeEditorEl = useMemo(() => (
    <CodeEditor
      autoHeight
      // height={height}
      onChange={(val: string) => {
        setContent(val);
        onChangeContent(val);
      }}
      showLineNumbers={false}
      // onDidChangeCursorPosition={onDidChangeCursorPosition}
      // placeholder="Start typing here..."
      // selected={selected}
      // setSelected={setSelected}
      // setTextareaFocused={setTextareaFocused}
      // shortcuts={[
      //   (monaco, editor) => executeCode(monaco, () => {
      //     runBlockAndTrack(editor.getValue());
      //   }),
      // ]}
      // textareaFocused={textareaFocused}
      value={content}
      width="100%"
    />
  ), [
    content,
    // height,
    // selected,
    // textareaFocused,
  ]);

  return (
    <ChartBlockStyle>
      <FlexContainer
        alignItems="center"
        justifyContent="space-between"
        fullWidth
      >
        <Select
          compact
          onChange={e => setChartType(e.target.value)}
          placeholder="Select chart type"
          small
          value={chartType}
        >
          {CHART_TYPES.map((chartType: string) => (
            <option key={chartType} value={chartType}>
              {capitalize(chartType)}
            </option>
          ))}
        </Select>

        <FlexContainer>
          <Select
            compact
            onChange={e => setSourceBlockUUID(e.target.value)}
            placeholder="Source block"
            small
            value={sourceBlockUUID}
          >
            {blocksOfType?.map(({ uuid }: BlockType) => (
              <option key={uuid} value={uuid}>
                {uuid}
              </option>
            ))}
          </Select>

          <Spacing mr={1} />

          <KeyboardShortcutButton
            blackBorder
            compact
            inline
            onClick={() => setIsEditing(prev => !prev)}
            selected={isEditing}
            uuid={`ChartBlock/edit/${block.uuid}`}
          >
            <Edit size={UNIT * 2} />
          </KeyboardShortcutButton>
        </FlexContainer>
      </FlexContainer>

      <Spacing mt={PADDING_UNITS} />

      <FlexContainer
        justifyContent="space-between"
        fullWidth
      >
        <Flex>
          Chart
        </Flex>

        {isEditing && (
          <ConfigurationOptionsStyle>
            <FlexContainer
              flexDirection="column"
            >
              {configurationOptions?.map(({
                label,
                type,
                uuid,
              }, idx: number) => {
                const el = (
                  <TextInput
                    key={uuid}
                    label={label()}
                    small
                    type={type}
                  />
                );

                return (
                  <Spacing key={uuid} mt={idx >= 1 ? 1 : 0}>
                    {el}
                  </Spacing>
                );
              })}
            </FlexContainer>
          </ConfigurationOptionsStyle>
        )}
      </FlexContainer>

      {isEditing && (
        <CodeContainerStyle>
          <CodeStyle>
            {codeEditorEl}
          </CodeStyle>
        </CodeContainerStyle>
      )}
    </ChartBlockStyle>
  );
}

export default ChartBlock;
