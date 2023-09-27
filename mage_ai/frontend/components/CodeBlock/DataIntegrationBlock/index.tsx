import { useMemo } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { Check, Close } from '@oracle/icons';
import { HeaderSectionStyle, StreamSectionStyle } from './index.style';
import { MainNavigationTabEnum } from '@components/DataIntegrationModal/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import { getSelectedStreams } from '@utils/models/block';
import { pushAtIndex } from '@utils/array';

type DataIntegrationBlockProps = {
  block: BlockType,
  codeEditor?: any;
  callbackEl?: any;
  onChangeBlock?: (block: BlockType) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    blockUUID: string;
  }) => void;
  showDataIntegrationModal?: (block: BlockType, opts?: {
    onChangeBlock?: (block: BlockType) => void;
  }) => void;
};

function DataIntegrationBlock({
  block,
  codeEditor,
  callbackEl,
  onChangeBlock,
  openSidekickView,
  showDataIntegrationModal,
}: DataIntegrationBlockProps) {
  const {
    catalog,
    language,
    metadata,
    type: blockType,
    uuid: blockUUID,
  } = block;
  const {
    name: dataIntegrationName,
  } = metadata?.data_integration || {}

  const streams = useMemo(() => getSelectedStreams(block), [
    block,
  ])

  const isSource = BlockTypeEnum.DATA_LOADER === blockType;
  const displayTypeText: string = isSource ? 'source' : 'destination'

  const tableEl = useMemo(() => {
    let columnFlex = [1, 1, 1, null];
    let columnsToShow = [
      {
        uuid: 'Stream',
      },
      {
        uuid: 'Columns',
      },
      {
        center: true,
        uuid: 'Sync method',
      },
      {
        uuid: 'Parallel',
      },
    ];

    if (!isSource) {
      columnFlex = pushAtIndex(1, 1, columnFlex);
      columnsToShow = pushAtIndex({
        uuid: 'Table name',
      }, 1, columnsToShow)
    }

    return (
      <Table
        columnFlex={columnFlex}
        columns={columnsToShow}
        rows={streams?.map(({
          destination_table: tableName,
          metadata: metadataArray,
          replication_method: replicationMethod,
          run_in_parallel: runInParallel,
          stream,
          tap_stream_id: tapStreamID,
        }) => {
          const streamName = stream || tapStreamID;
          let columnsCount = 0;
          let columnsCountSelected = 0;

          metadataArray?.forEach(({
            breadcrumb,
            metadata,
          }) => {
            if (breadcrumb?.length >= 1) {
              columnsCount += 1;
              if (metadata?.selected) {
                columnsCountSelected += 1;
              }
            }
          });

          let row = [
            <Link
              key="stream"
              monospace
              onClick={() => alert('OPEN MODAL')}
              preventDefault
              sameColorAsText
            >
              {streamName}
            </Link>,
            <Text default monospace key="columns">
              {columnsCountSelected} <Text
                inline
                monospace
                muted
              >
                /
              </Text> {columnsCount}
            </Text>,
            <Text center default key="replicationMethod">
              {replicationMethod && capitalizeRemoveUnderscoreLower(replicationMethod)}
            </Text>,
            <FlexContainer justifyContent="flex-end" key="runInParallel">
              {runInParallel
                ? <Check size={UNIT * 2} success />
                : <Close muted size={UNIT * 2} />
              }
            </FlexContainer>,
          ];

          if (!isSource) {
            row = pushAtIndex((
              <Text default key="tableName" monospace>
                {tableName || streamName}
              </Text>
            ), 1, row);
          }

          return row;
        })}
      />
    );
  }, [
    isSource,
    streams,
  ]);

  return (
    <>
      {BlockLanguageEnum.YAML === language && (
        <HeaderSectionStyle>
          <Divider light />

          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="center" justifyContent="space-between">
              <Flex flex={1} flexDirection="column">
                <Text bold monospace muted small uppercase>
                  {displayTypeText}
                </Text>

                <Headline default>
                  {dataIntegrationName}
                </Headline>
              </Flex>

              <Button
                compact
                onClick={() => showDataIntegrationModal({
                  block,
                  defaultMainNavigationTab: MainNavigationTabEnum.OVERVIEW,
                  onChangeBlock,
                })}
                secondary
              >
                Configure {displayTypeText}
              </Button>
            </FlexContainer>
          </Spacing>

          <Divider light />
        </HeaderSectionStyle>
      )}

      {BlockLanguageEnum.PYTHON === language && (
        <>
          {codeEditor}
          {callbackEl}
        </>
      )}

      <StreamSectionStyle>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center" justifyContent="space-between">
            <Flex flex={1} flexDirection="column">
              <Text bold default large>
                {pluralize('stream', streams?.length)}
              </Text>
            </Flex>

            <Button
              compact
              onClick={() => showDataIntegrationModal({
                block,
                defaultMainNavigationTab: MainNavigationTabEnum.STREAMS,
                onChangeBlock,
              })}
              secondary
            >
              Edit streams
            </Button>
          </FlexContainer>
        </Spacing>

        {tableEl}
      </StreamSectionStyle>
    </>
  );
}

export default DataIntegrationBlock;
