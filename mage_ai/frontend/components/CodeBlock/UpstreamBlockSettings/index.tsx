import { ThemeContext } from 'styled-components';
import { useContext, useMemo } from 'react';

import BlockType, { BlockLanguageEnum } from '@interfaces/BlockType';
import Link from '@oracle/elements/Link';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import {
  CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION,
  CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION_TABLE_NAME,
} from '@interfaces/ChartBlockType';
import { getColorsForBlockType } from '../index.style';
import { pauseEvent } from '@utils/events';

type ConfigurationType = {
  [key: string]: any;
};

type UpstreamBlockSettingsProps = {
  block: BlockType;
  blockConfiguration: ConfigurationType;
  blockRefs: any;
  blocks: BlockType[];
  updateBlockConfiguration: (payload: ConfigurationType) => void;
};

function UpstreamBlockSettings({
  block,
  blockConfiguration,
  blockRefs,
  blocks,
  updateBlockConfiguration,
}: UpstreamBlockSettingsProps) {
  const themeContext = useContext(ThemeContext);

  const isRBlock = BlockLanguageEnum.R === block?.language;
  const isSQLBlock = BlockLanguageEnum.SQL === block?.language;
  const atLeastOneUpstreamBlockIsPython =
    blocks?.find(({ language }) => BlockLanguageEnum.PYTHON === language);

  const columnFlex = useMemo(() => {
    const arr = [
      null,
    ];

    if (isSQLBlock && atLeastOneUpstreamBlockIsPython) {
      arr.push(...[null, 1]);
    } else {
      arr.push(1);
    }

    return arr;
  }, [
    atLeastOneUpstreamBlockIsPython,
    isSQLBlock,
  ]);

  const columns = useMemo(() => {
    const arr = [
      {
        tooltipMessage: null,
        uuid: 'Variable',
      },
      {
        tooltipMessage: null,
        uuid: 'Block',
      },
    ];

    if (isSQLBlock && atLeastOneUpstreamBlockIsPython) {
      arr.push({
        tooltipMessage: 'Customize the full table name that this block gets created in. ' +
          'Include database, schema, and table name where applicable.',
        uuid: 'Table name',
      });
    }

    return arr;
  }, [
    atLeastOneUpstreamBlockIsPython,
    isSQLBlock,
  ]);

  const rows = useMemo(() => blocks?.map((b: BlockType, i: number) => {
    const {
      color,
      language,
      type,
      uuid,
    } = b;
    const blockColor = getColorsForBlockType(
      type,
      {
        blockColor: color,
        theme: themeContext,
      },
    ).accent;
    const upstreamBlockIsPython = BlockLanguageEnum.PYTHON === language;

    let variableEl;
    if (isSQLBlock) {
      variableEl = `{{ df_${i + 1} }}`;
    } else if (isRBlock) {
      variableEl = `df${i + 1}`;
    } else {
      variableEl = `data${i >= 1 ? `_${i + 1}` : null}`;
    }

    const arr = [
      <Text
        default
        key={`variable-${uuid}`}
        monospace
        small
      >
        {variableEl}
      </Text>,
      <Link
        color={blockColor}
        key={`block-${uuid}`}
        onClick={() => {
          const refBlock = blockRefs?.current?.[`${type}s/${uuid}.py`];
          refBlock?.current?.scrollIntoView();
        }}
        preventDefault
        small
      >
        <Text
          color={blockColor}
          monospace
          small
        >
          {uuid}
        </Text>
      </Link>,
    ];

    if (isSQLBlock) {
      const key = `table-name-input-${uuid}`;
      const config = blockConfiguration?.[CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION] || {};
      const configUpstreamBlock = config?.[uuid] || {};

      if (upstreamBlockIsPython) {
        arr.push(
          <TextInput
            borderless
            compact
            key={key}
            monospace
            onChange={({
              target: {
                value,
              },
            }) => {

              updateBlockConfiguration({
                [CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION]: {
                  // @ts-ignore
                  ...config,
                  [uuid]: {
                    // @ts-ignore
                    ...configUpstreamBlock,
                    [CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION_TABLE_NAME]: value,
                  },
                },
              });
            }}
            onClick={pauseEvent}
            placeholder="[database_optional].[schema_optional].[table]"
            small
            value={configUpstreamBlock?.[CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION_TABLE_NAME] || ''}
          />,
        );
      } else if (atLeastOneUpstreamBlockIsPython) {
        arr.push(
          <Text
            italic
            key={key}
            muted
            small
          >
            Table name is defined in upstream block.
          </Text>,
        );
      }
    }

    return arr;
  }), [
    atLeastOneUpstreamBlockIsPython,
    blockConfiguration,
    blockRefs,
    blocks,
    isRBlock,
    isSQLBlock,
    themeContext,
    updateBlockConfiguration,
  ]);

  return (
    <>
      <Table
        columnFlex={columnFlex}
        columns={columns}
        compact
        noBorder
        rows={rows}
        uuid={`CodeBlock/UpstreamBlockSettings/${block?.uuid}`}
      />
    </>
  );
}

export default UpstreamBlockSettings;
