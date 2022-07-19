import { useState } from 'react';

import BlockType, {
  CHART_TYPES,
  ChartTypeEnum,
} from '@interfaces/BlockType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { CONFIGURATIONS_BY_CHART_TYPE } from './constants';
import { ChartBlockStyle } from './index.style';
import { Edit } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';

type ChartBlockType = {
  block: BlockType;
};

function ChartBlock({
  block,
}: ChartBlockType) {
  const {
    configuration = {},
  } = block;
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [chartType, setChartType] = useState<ChartTypeEnum>(configuration.chart_type);

  const configurationOptions = CONFIGURATIONS_BY_CHART_TYPE[chartType];

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
          value={chartType}
        >
          <option value="" />
          {CHART_TYPES.map((chartType: string) => (
            <option key={chartType} value={chartType}>
              {capitalize(chartType)}
            </option>
          ))}
        </Select>

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

      <Spacing mt={PADDING_UNITS} />

      <FlexContainer
        justifyContent="space-between"
        fullWidth
      >
        <Flex>
          Chart
        </Flex>

        {isEditing && (
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
        )}
      </FlexContainer>
    </ChartBlockStyle>
  );
}

export default ChartBlock;
