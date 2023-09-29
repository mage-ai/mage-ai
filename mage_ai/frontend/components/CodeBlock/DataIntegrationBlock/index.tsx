import { useMemo } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import InputsTable, {
  InputBlockType,
} from '@components/DataIntegrationModal/Credentials/InputsTable';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { Check, Settings } from '@oracle/icons';
import { EmptyCodeSpace, HeaderSectionStyle, StreamSectionStyle } from './index.style';
import { MainNavigationTabEnum } from '@components/DataIntegrationModal/constants';
import { OpenDataIntegrationModalType, SubTabEnum } from '@components/DataIntegrationModal/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { StreamType } from '@interfaces/IntegrationSourceType';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { buildInputsFromUpstreamBlocks } from '@utils/models/block'
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import {
  getParentStreamID,
  getSelectedStreams,
  getStreamID,
  isStreamSelected,
} from '@utils/models/block';
import { pushAtIndex } from '@utils/array';

type DataIntegrationBlockProps = {
  block: BlockType,
  blockContent?: string;
  blocksMapping?: {
    [blockUUID: string]: BlockType;
  };
  codeEditor?: any;
  callbackEl?: any;
  onChangeBlock?: (block: BlockType) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    blockUUID: string;
  }) => void;
  savePipelineContent?: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
} & OpenDataIntegrationModalType;

function DataIntegrationBlock({
  block,
  blockContent,
  blocksMapping,
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

  const allStreams = useMemo(() => getSelectedStreams(block, {
    getAll: true,
  }), [
    block,
  ]);
  const streams = useMemo(() => allStreams?.filter(isStreamSelected), [
    allStreams,
  ]);

  const allStreamsCount = useMemo(() => allStreams?.length || 0, [allStreams]);
  const streamsCount = useMemo(() => streams?.length || 0, [streams]);

  const isSource = BlockTypeEnum.DATA_LOADER === blockType;
  const displayTypeText: string = isSource ? 'source' : 'destination'

  const tableEl = useMemo(() => {
    let columnFlex = [1, 1, 1, null];
    let columnsToShow = [
      {
        uuid: 'Stream',
      },
      {
        center: true,
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
        rows={streams?.map((stream: StreamType) => {
          const {
            destination_table: tableName,
            metadata: metadataArray,
            replication_method: replicationMethod,
            run_in_parallel: runInParallel,
            tap_stream_id: tapStreamID,
          } = stream || {};

          const streamName = getStreamID(stream);
          const parentStream = getParentStreamID(stream);
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

          const danger = BlockLanguageEnum.YAML === language && !columnsCountSelected;

          let columnsCountEl;
          let streamNameEl = (
            <Link
              danger={danger}
              key="stream"
              monospace
              onClick={() => showDataIntegrationModal({
                block: {
                  ...block,
                  content: blockContent,
                },
                defaultMainNavigationTab: streamName,
                defaultMainNavigationTabSub: parentStream,
                onChangeBlock,
              })}
              preventDefault
              sameColorAsText={!danger}
            >
              {streamName} {danger && (
                <Text inline default monospace>
                  will fail unless a column is selcted
                </Text>
              )}
            </Link>
          );

          if (columnsCountSelected >= 1 || BlockLanguageEnum.PYTHON === language) {
            columnsCountEl = (
              <Text center default monospace key="columns">
                {columnsCountSelected} <Text
                  inline
                  monospace
                  muted
                >
                  /
                </Text> {columnsCount}
              </Text>
            );
          } else {
            columnsCountEl = (
              <Text center danger key="columns">
                No columns selected
              </Text>
            );
          }

          let row = [
            streamNameEl,
            columnsCountEl,
            <Text center default key="replicationMethod">
              {replicationMethod && capitalizeRemoveUnderscoreLower(replicationMethod)}
            </Text>,
            <FlexContainer justifyContent="flex-end" key="runInParallel">
              {runInParallel
                ? <Check size={UNIT * 2} success />
                : <Text monospace muted>-</Text>
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
    block,
    language,
    isSource,
    showDataIntegrationModal,
    streams,
  ]);

  const inputsBlocks: InputBlockType[] = useMemo(() => buildInputsFromUpstreamBlocks(
    block?.upstream_blocks?.map(uuid => blocksMapping?.[uuid]),
    block?.configuration?.data_integration,
  ), [
    block,
    blocksMapping,
  ]);

  return (
    <>
      {BlockLanguageEnum.YAML === language && (
        <HeaderSectionStyle>
          <Divider light />

          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="flex-start" justifyContent="space-between">
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
                  block: {
                    ...block,
                    content: blockContent,
                  },
                  defaultMainNavigationTab: MainNavigationTabEnum.CONFIGURATION,
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
        <HeaderSectionStyle>
          <Divider light />

          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="flex-start" justifyContent="space-between">
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
                  block: {
                    ...block,
                    content: blockContent,
                  },
                  defaultMainNavigationTab: MainNavigationTabEnum.CONFIGURATION,
                  onChangeBlock,
                })}
                secondary
              >
                Configure {displayTypeText} documentation
              </Button>
            </FlexContainer>
          </Spacing>

          <Divider light />

          <Spacing p={PADDING_UNITS}>
            <FlexContainer
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Flex flex={4} flexDirection="column">
                <Text bold monospace muted small uppercase>
                  Inputs
                </Text>

                <Spacing mt={1}>
                  {inputsBlocks?.length >= 1 && (
                    <Text default>
                      The output of these upstream blocks are used as positional arguments
                      for decorated functions.
                    </Text>
                  )}
                  {!inputsBlocks?.length && (
                    <Text default>
                      There are currently no positional arguments for decorated functions.
                      <br />
                      To use the output of 1 or more upstream blocks as positional arguments
                      for decorated functions, add and configure 1 or more inputs.
                    </Text>
                  )}
                </Spacing>
              </Flex>

              <Spacing mr={PADDING_UNITS} />

              <Flex flex={1} justifyContent="flex-end">
                <Button
                  compact
                  onClick={() => showDataIntegrationModal({
                    block: {
                      ...block,
                      content: blockContent,
                    },
                    defaultMainNavigationTab: MainNavigationTabEnum.CONFIGURATION,
                    defaultSubTab: SubTabEnum.UPSTREAM_BLOCK_SETTINGS,
                    onChangeBlock,
                  })}
                  secondary
                >
                  {inputsBlocks?.length >= 1 ? 'Configure inputs' : 'Add inputs'}
                </Button>
              </Flex>
            </FlexContainer>
          </Spacing>

          {inputsBlocks?.length >= 1 && (
            <InputsTable
              inputsBlocks={inputsBlocks}
            />
          )}
        </HeaderSectionStyle>
      )}

      <StreamSectionStyle>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center" justifyContent="space-between">
            {streamsCount >= 1 && (
              <>
                <Flex flex={1} flexDirection="column">
                  <Text bold default large>
                    {streamsCount} <Text
                      bold
                      inline
                      monospace
                      muted
                    >
                      /
                    </Text> {allStreamsCount} {pluralize(
                      'stream',
                      allStreamsCount,
                      false,
                      true,
                    )} selected
                  </Text>
                </Flex>

                <Spacing mr={1} />
              </>
            )}

            <Button
              beforeIcon={!streamsCount && <Settings size={2 * UNIT} />}
              compact={streamsCount >= 1}
              onClick={() => showDataIntegrationModal({
                block: {
                  ...block,
                  content: blockContent,
                },
                defaultMainNavigationTab: MainNavigationTabEnum.STREAMS,
                onChangeBlock,
              })}
              primary={!streamsCount}
              secondary={streamsCount >= 1}
            >
              {streamsCount >= 1 && 'Edit streams'}
              {!streamsCount && 'Set up streams'}
            </Button>
          </FlexContainer>
        </Spacing>

        {streamsCount >= 1 && tableEl}

        {streamsCount >= 1 && <Spacing mb={PADDING_UNITS} />}
      </StreamSectionStyle>

      {BlockLanguageEnum.PYTHON === language && (
        <>
          <EmptyCodeSpace>
            <Spacing pb={PADDING_UNITS} />
          </EmptyCodeSpace>

          {codeEditor}
          {callbackEl}
        </>
      )}
    </>
  );
}

export default DataIntegrationBlock;
