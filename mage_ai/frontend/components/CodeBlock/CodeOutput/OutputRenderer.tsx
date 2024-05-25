import { ThemeContext } from 'styled-components';
import { useContext, useMemo } from 'react';

import BlockType, { OutputType } from '@interfaces/BlockType';
import Divider from '@oracle/elements/Divider';
import HTMLOutput from './HTMLOutput';
import ImageOutput from './ImageOutput';
import MultiOutput from './MultiOutput';
import Spacing from '@oracle/elements/Spacing';
import TableOutput from './TableOutput';
import Text from '@oracle/elements/Text';
import TextOutput from './TextOutput';
import { DataTypeEnum } from '@interfaces/KernelOutputType';
import { OutputRowProps } from './index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { getColorsForBlockType } from '../index.style';
import { ignoreKeys, isObject } from '@utils/hash';

type OutputRendererProps = {
  block: BlockType;
  containerWidth?: number;
  index?: number;
  output: OutputType;
  onTabChangeCallback?: (tab: TabType) => void;
  selected: boolean;
  singleOutput?: boolean;
} & OutputRowProps;

function OutputRenderer({
  block,
  containerWidth,
  index,
  onTabChangeCallback,
  output,
  selected,
  singleOutput,
  ...outputRowSharedProps
}: OutputRendererProps) {
  const themeContext = useContext(ThemeContext);
  const {
    data,
    multi_output: multiOutput,
    outputs,
    text_data: textData,
    type: dataType,
    variable_uuid: variableUuid,
  }: OutputType = output;
  const blockColor = useMemo(
    () =>
      getColorsForBlockType(block?.type, {
        blockColor: block?.color,
        theme: themeContext,
      }),
    [block, themeContext],
  );
  let textValue = useMemo(
    () => textData || (typeof data === 'string' ? data : ''),
    [data, textData],
  );
  const outputsLength = useMemo(() => outputs?.length, [outputs]);

  if ((DataTypeEnum.GROUP === dataType || multiOutput || singleOutput) && outputsLength >= 1) {
    const el = (
      <MultiOutput
        color={blockColor?.accent}
        header={
          DataTypeEnum.GROUP === dataType ? (
            <Spacing px={PADDING_UNITS}>
              <Text color={blockColor?.accent} monospace small>{variableUuid}</Text>
            </Spacing>
          ) : null
        }
        onTabChange={onTabChangeCallback}
        outputs={outputs?.map((item, idx) => ({
          render: () => {
            const { type: itemType } = item;

            return (
              <>
                {(DataTypeEnum.TABLE !== itemType || index === 0 || idx === 0) && <Divider medium />}

                <OutputRenderer
                  {...outputRowSharedProps}
                  block={block}
                  containerWidth={containerWidth}
                  index={index}
                  onTabChangeCallback={onTabChangeCallback}
                  output={ignoreKeys(item, ['multi_output', 'outputs'])}
                  selected={selected}
                />
              </>
            );
          },
          uuid: `Output ${idx}`,
        }))}
      />
    );

    if (DataTypeEnum.GROUP === dataType) {
      return <Spacing mt={index >= 1 ? PADDING_UNITS : 0}>{el}</Spacing>;
    }

    return el;
  } else if (DataTypeEnum.TEXT_HTML === dataType) {
    return <HTMLOutput {...outputRowSharedProps} value={textValue} />;
  } else if (DataTypeEnum.TABLE === dataType) {
    return <TableOutput containerWidth={containerWidth} output={output} selected={selected} />;
  } else if (DataTypeEnum.IMAGE_PNG === dataType) {
    return <ImageOutput data={textValue} />;
  } else {
    const objectData = [data || textData]?.find(obj => obj && isObject(obj));

    if (DataTypeEnum.OBJECT === dataType && objectData) {
      textValue = JSON.stringify(objectData, null, 2);
    }

    return (
      <TextOutput
        {...{
          ...outputRowSharedProps,
          first: true,
          last: true,
        }}
        value={textValue}
      />
    );
  }
}

export default OutputRenderer;
