import { useCallback, useContext } from 'react';
import { ThemeContext } from 'styled-components';

import BlockType from '@interfaces/BlockType';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import { DBT_FLAG_FULL_REFRESH } from '@utils/models/dbt';
import { UNIT, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getModelAttributes } from '@utils/models/dbt';
import { remove } from '@utils/array';

type DBTSettingsProps = {
  blocks: BlockType[];
  updateVariables: (variables: {
    [key: string]: any;
  }) => {
    [key: string]: any;
  };
  variables: {
    [key: string]: any;
  };
};

function DBTSettings({
  blocks,
  updateVariables: updateVariablesProp,
  variables,
}: DBTSettingsProps) {
  const themeContext = useContext(ThemeContext);

  const updateVariables = useCallback((uuid: string, payload: {
    flags?: string[];
    prefix?: string;
    suffix?: string;
  }) => updateVariablesProp(() => {
    const mageVariables = variables?.__mage_variables || {};
    const mageVariablesBlocks = mageVariables?.blocks || {};
    const blockData = mageVariablesBlocks[uuid] || {};
    const config = blockData?.configuration || {};

    return {
      ...variables,
      __mage_variables: {
        ...mageVariables,
        blocks: {
          ...mageVariablesBlocks,
          [uuid]: {
            ...blockData,
            configuration: {
              ...config,
              ...payload,
            },
          },
        },
      },
    };
  }), [
    updateVariablesProp,
    variables,
  ]);

  return (
    <>
      <Headline>
        dbt runtime settings
      </Headline>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <Table
          columnFlex={[1, null, null, null]}
          columns={[
            {
              uuid: 'Block',
            },
            {
              uuid: 'Flags',
            },
            {
              uuid: 'Prefix',
            },
            {
              uuid: 'Suffix',
            },
          ]}
          compact
          rows={blocks?.map((block: BlockType) => {
            const {
              type,
              uuid,
            } = block;
            const {
              name: modelName,
            } = getModelAttributes(block);
            const color = getColorsForBlockType(
              type,
              { blockColor: block.color, theme: themeContext },
            ).accent;

            const config = variables?.__mage_variables?.blocks?.[uuid]?.configuration;
            const {
              prefix,
              suffix,
            } = config || {};
            const flags = config?.flags || [];
            const flagFullRefresh = !!flags?.includes(DBT_FLAG_FULL_REFRESH);

            return [
              <Tooltip
                block
                key={`uuid-${uuid}`}
                label={(
                  <Text monospace small>
                    {uuid}
                  </Text>
                )}
                size={null}
                widthFitContent
              >
                <FlexContainer alignItems="center">
                  <Circle
                    color={color}
                    size={UNIT * 1.5}
                    square
                  />
                  <Spacing mr={1} />
                  <Text
                    monospace
                    small
                  >
                    {prefix && (
                      <Text default inline monospace small>
                        {prefix}
                      </Text>
                    )}{modelName}{suffix && (
                      <Text default inline monospace small>
                        {suffix}
                      </Text>
                    )}
                  </Text>
                </FlexContainer>
              </Tooltip>,
              <FlexContainer alignItems="center" key={`flags-${uuid}`}>
                <Checkbox
                  checked={flagFullRefresh}
                  label={DBT_FLAG_FULL_REFRESH}
                  monospace
                  onClick={() => updateVariables(uuid, {
                    flags: flagFullRefresh
                      ? remove(flags, flag => DBT_FLAG_FULL_REFRESH === flag)
                      : flags.concat(DBT_FLAG_FULL_REFRESH),
                  })}
                  small
                />
              </FlexContainer>,
              <TextInput
                compact
                key={`prefix-${uuid}`}
                monospace
                onChange={(e) => updateVariables(uuid, {
                  prefix: e.target.value,
                })}
                placeholder="N+, +"
                small
                value={prefix}
                width={UNIT * 10}
              />,
              <TextInput
                compact
                key={`suffix-${uuid}`}
                monospace
                onChange={(e) => updateVariables(uuid, {
                  suffix: e.target.value,
                })}
                placeholder="+, +N"
                small
                value={suffix}
                width={UNIT * 10}
              />,
            ];
          })}
        />
      </Spacing>
    </>
  );
}

export default DBTSettings;
