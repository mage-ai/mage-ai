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
import { AlertTriangle, Check, Settings } from '@oracle/icons';
import { CalloutStyle, EmptyCodeSpace, HeaderSectionStyle, StreamSectionStyle } from './index.style';
import { MainNavigationTabEnum } from '@components/DataIntegrationModal/constants';
import { OpenDataIntegrationModalType, SubTabEnum } from '@components/DataIntegrationModal/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ReplicationMethodEnum, StreamType } from '@interfaces/IntegrationSourceType';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { buildInputsFromUpstreamBlocks } from '@utils/models/block'
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import {
  getParentStreamID,
  getSelectedColumnsAndAllColumn,
  getSelectedStreams,
  getStreamID,
  getStreamIDWithParentStream,
  isStreamSelected,
} from '@utils/models/block';
import { pushAtIndex } from '@utils/array';

type DataIntegrationBlockProps = {
  block: BlockType,
  blockContent?: string;
  blocksMapping?: {
    [blockUUID: string]: BlockType;
  };
  children?: any;
  codeEditor?: any;
  callbackEl?: any;
  hasElementsBelow?: boolean;
  onChangeBlock?: (block: BlockType) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    blockUUID: string;
  }) => void;
  savePipelineContent?: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  setContent?: (content: string) => void;
} & OpenDataIntegrationModalType;

function DataIntegrationBlock({
  block,
  blockContent,
  blocksMapping,
  children,
  codeEditor,
  callbackEl,
  hasElementsBelow,
  onChangeBlock,
  openSidekickView,
  setContent,
  showDataIntegrationModal,
}: DataIntegrationBlockProps) {
  const {
    catalog,
    language,
    metadata,
    type: blockType,
    upstream_blocks: upstreamBlockUUIDs,
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
            bookmark_properties: bookmarkProperties,
            destination_table: tableName,
            replication_method: replicationMethod,
            run_in_parallel: runInParallel,
            tap_stream_id: tapStreamID,
          } = stream || {};

          const streamName = getStreamID(stream);
          const parentStream = getParentStreamID(stream);
          const streamUUID = getStreamIDWithParentStream(stream);

          const {
            allColumns,
            selectedColumns,
          } = getSelectedColumnsAndAllColumn(stream);
          const columnsCount = Object.keys(allColumns || [])?.length || 0;
          const columnsCountSelected = Object.keys(selectedColumns || [])?.length || 0;

          const danger = BlockLanguageEnum.YAML === language && !columnsCountSelected;

          let columnsCountEl;
          let streamNameEl = (
            <Link
              danger={danger}
              key={`${streamUUID}-stream`}
              monospace
              onClick={() => showDataIntegrationModal({
                block: {
                  ...block,
                  content: blockContent,
                },
                defaultMainNavigationTab: streamName,
                defaultMainNavigationTabSub: parentStream,
                defaultSubTab: danger ? SubTabEnum.SETTINGS : SubTabEnum.OVERVIEW,
                onChangeBlock,
                setContent,
              })}
              preventDefault
              sameColorAsText={!danger}
            >
              {streamName} {danger && (
                <Text inline default monospace>
                  will fail if no columns selected
                </Text>
              )}
            </Link>
          );

          if (columnsCountSelected >= 1 || BlockLanguageEnum.PYTHON === language) {
            columnsCountEl = (
              <Text center default monospace>
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
              <Text center danger>
                No columns selected
              </Text>
            );
          }

          let row = [
            streamNameEl,
            <Link
              danger={danger}
              key={`${streamUUID}-columns`}
              monospace
              onClick={() => showDataIntegrationModal({
                block: {
                  ...block,
                  content: blockContent,
                },
                defaultMainNavigationTab: streamName,
                defaultMainNavigationTabSub: parentStream,
                defaultSubTab: SubTabEnum.SETTINGS,
                onChangeBlock,
                setContent,
              })}
              preventDefault
              sameColorAsText={!danger}
            >
              {columnsCountEl}
            </Link>,
            <FlexContainer
              alignItems="center"
              key={`${streamUUID}-replicationMethod`}
              justifyContent="center"
            >
              <Text center default>
                {replicationMethod && capitalizeRemoveUnderscoreLower(replicationMethod)}
              </Text>

              {ReplicationMethodEnum.INCREMENTAL === replicationMethod && (
                <>
                  <Spacing mr={1} />

                  {!bookmarkProperties?.length && (
                    <Text danger xsmall>
                      No bookmark properties set
                    </Text>
                  )}

                  {bookmarkProperties?.length >= 1 && bookmarkProperties?.map((
                    col: string,
                    idx: number,
                  ) => (
                    <Text inline key={col} monospace muted xsmall>
                      {idx >= 1 && ', '}{col}
                    </Text>
                  ))}
                </>
              )}
            </FlexContainer>,
            <FlexContainer justifyContent="flex-end" key={`${streamUUID}-runInParallel`}>
              {runInParallel
                ? <Check size={UNIT * 2} success />
                : <Text monospace muted>-</Text>
              }
            </FlexContainer>,
          ];

          if (!isSource) {
            row = pushAtIndex((
              <Text default key={`${streamUUID}-tableName`} monospace>
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
    blockContent,
    language,
    isSource,
    setContent,
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
                  setContent,
                })}
                secondary
              >
                Configure {displayTypeText}
              </Button>
            </FlexContainer>
          </Spacing>

          <Divider light />

          {inputsBlocks?.length >= 1 && (
            <InputsTable
              inputsBlocks={inputsBlocks}
            />
          )}
        </HeaderSectionStyle>
      )}

      {BlockLanguageEnum.PYTHON === language && (
        <HeaderSectionStyle>
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
                  setContent,
                })}
                secondary
              >
                Configure {displayTypeText}
              </Button>
            </FlexContainer>
          </Spacing>

          <Divider light />

          {upstreamBlockUUIDs?.length >= 1 && (
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
                      setContent,
                    })}
                    secondary
                  >
                    {inputsBlocks?.length >= 1 ? 'Configure inputs' : 'Add inputs'}
                  </Button>
                </Flex>
              </FlexContainer>
            </Spacing>
          )}

          {inputsBlocks?.length >= 1 && (
            <InputsTable
              inputsBlocks={inputsBlocks}
            />
          )}
        </HeaderSectionStyle>
      )}

      <StreamSectionStyle
        noBorderRadius={hasElementsBelow}
      >
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
                setContent,
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
          {streamsCount >= 1 && (
            <HeaderSectionStyle>
              <Spacing pb={PADDING_UNITS} px={PADDING_UNITS}>
                <CalloutStyle>
                  <FlexContainer alignItems="center">
                    <Flex>
                      <AlertTriangle size={2 * UNIT} warning />
                    </Flex>

                    <Spacing mr={PADDING_UNITS} />

                    <Text muted>
                      The decorated function <Text
                        inline
                        monospace
                        default
                      >
                        @selected_streams
                      </Text> and <Text
                        inline
                        monospace
                        default
                      >
                        @catalog
                      </Text> will override any stream settings configured
                      for <Text
                        bold
                        color={getColorsForBlockType(block?.type, {
                          blockColor: block?.color,
                        }).accent}
                        inline
                        monospace
                      >
                        {blockUUID}
                      </Text>.
                    </Text>
                  </FlexContainer>
                </CalloutStyle>
              </Spacing>
            </HeaderSectionStyle>
          )}

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
