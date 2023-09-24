import { useMemo } from 'react';

import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import Divider from '@oracle/elements/Divider';
import Table from '@components/shared/Table';
import Button from '@oracle/elements/Button';
import Spacing from '@oracle/elements/Spacing';
import FlexContainer from '@oracle/components/FlexContainer';
import Flex from '@oracle/components/Flex';
import Text from '@oracle/elements/Text';
import Headline from '@oracle/elements/Headline';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { HeaderSectionStyle, StreamSectionStyle } from './index.style';
import { Check, Close } from '@oracle/icons';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';

type DataIntegrationBlockProps = {
  block: BlockType,
  codeEditor?: any;
  callbackEl?: any;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    blockUUID: string;
  }) => void;
};

function DataIntegrationBlock({
  block,
  codeEditor,
  callbackEl,
  openSidekickView,
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

  const streams = useMemo(() => (catalog?.streams || [])?.filter(({
    metadata,
  }) => metadata?.find(({ breadcrumb }) => breadcrumb?.length === 0)?.metadata?.selected),
  [
    catalog,
  ])

  const isSource = BlockTypeEnum.DATA_LOADER === blockType;
  const displayTypeText: string = isSource ? 'source' : 'destination'

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
                onClick={() => openSidekickView(
                  ViewKeyEnum.BLOCK_SETTINGS,
                  true,
                  {
                    blockUUID,
                  }
                )}
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
              onClick={() => openSidekickView(
                ViewKeyEnum.BLOCK_SETTINGS,
                true,
                {
                  blockUUID,
                }
              )}
              secondary
            >
              Configure streams
            </Button>
          </FlexContainer>
        </Spacing>

        <Table
          columnFlex={[1, 1, 1, null]}
          columns={[
            {
              uuid: 'Stream',
            },
            {
              uuid: 'Columns',
            },
            {
              center: true,
              uuid: 'Replication method',
            },
            {
              uuid: 'Run in parallel',
            },
          ]}
          rows={streams?.map(({
            metadata: metadataArray,
            replication_method: replicationMethod,
            run_in_parallel: runInParallel,
            stream,
            tap_stream_id: tapStreamID,
          }: WorkspaceType) => {
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

            return [
              <Text key="stream">
                {streamName}
              </Text>,
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
              <FlexContainer justifyContent="center" key="runInParallel">
                {runInParallel
                  ? <Check size={UNIT * 2} success />
                  : <Close muted size={UNIT * 2} />
                }
              </FlexContainer>,
            ];
          })}
        />
      </StreamSectionStyle>
    </>
  );
}

export default DataIntegrationBlock;
