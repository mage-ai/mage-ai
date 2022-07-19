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
  CodeStyle,
  ConfigurationOptionsStyle,
} from './index.style';
import { Edit } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';

type ChartBlockType = {
  block: BlockType;
  blocks: BlockType[];
  onChangeContent: (value: string) => void;
  updateWidget: (block: BlockType) => void;
};

function ChartBlock({
  block,
  blocks,
  onChangeContent,
  updateWidget,
}: ChartBlockType) {
  const {
    configuration = {},
  } = block;
  const {
    chart_type: chartType,
  } = configuration;
  const [content, setContent] = useState<string>(block.content);
  const [isEditing, setIsEditing] = useState<boolean>(!chartType);

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
      <Spacing mt={1} px={1}>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
          fullWidth
        >
          <Select
            compact
            onChange={e => updateWidget({
              ...block,
              upstream_blocks: [e.target.value],
            })}
            placeholder="Source block"
            small
            value={block.upstream_blocks?.[0] || ''}
          >
            {blocksOfType?.map(({ uuid }: BlockType) => (
              <option key={uuid} value={uuid}>
                {uuid}
              </option>
            ))}
          </Select>

          <FlexContainer>
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
      </Spacing>

      <Spacing mt={1} />

      <FlexContainer
        justifyContent="space-between"
        fullWidth
      >
        <Flex flex={2}>
          Chart
        </Flex>

        {isEditing && (
          <ConfigurationOptionsStyle>
            <FlexContainer
              flexDirection="column"
              fullWidth
            >
              <Spacing mb={1}>
                <Select
                  onChange={e => updateWidget({
                    ...block,
                    configuration: {
                      ...configuration,
                      chart_type: e.target.value,
                    },
                  })}
                  placeholder="Select chart type"
                  value={chartType}
                >
                  {CHART_TYPES.map((chartType: string) => (
                    <option key={chartType} value={chartType}>
                      {capitalize(chartType)}
                    </option>
                  ))}
                </Select>
              </Spacing>

              {configurationOptions?.map(({
                label,
                monospace,
                type,
                uuid,
              }) => {
                const el = (
                  <TextInput
                    fullWidth
                    key={uuid}
                    label={label()}
                    monospace={monospace}
                    onChange={e => updateWidget({
                    ...block,
                    configuration: {
                      ...configuration,
                      [uuid]: e.target.value,
                    },
                  })}
                    type={type}
                    value={configuration?.[uuid]}
                  />
                );

                return (
                  <Spacing key={uuid} mb={1}>
                    {el}
                  </Spacing>
                );
              })}
            </FlexContainer>
          </ConfigurationOptionsStyle>
        )}
      </FlexContainer>

      {isEditing && (
        <CodeStyle>
          {codeEditorEl}
        </CodeStyle>
      )}
    </ChartBlockStyle>
  );
}

export default ChartBlock;
