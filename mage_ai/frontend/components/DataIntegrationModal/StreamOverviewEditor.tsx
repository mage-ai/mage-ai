import { useMemo } from 'react';

import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import StreamSettingsEditorTable from './StreamSettingsEditorTable';
import StreamTableSelector from './StreamTableSelector';
import Text from '@oracle/elements/Text';
import {
  AttributeUUIDEnum,
  AttributesMappingType,
  StreamMapping,
  getParentStreamID,
  getStreamID,
} from '@utils/models/block';
import { BackgroundStyle } from './index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  REPLICATION_METHODS_BATCH_PIPELINE,
  ReplicationMethodEnum,
  UniqueConflictMethodEnum,
} from '@interfaces/IntegrationSourceType';
import { InputTypeEnum } from './constants';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

type StreamOverviewEditorProps = {
  attributesMapping: AttributesMappingType;
  selectedStreamMapping: StreamMapping;
  setAttributesMapping: (prev: (v: AttributesMappingType) => AttributesMappingType) => void;
  setSelectedStreamMapping: (prev: StreamMapping) => StreamMapping | StreamMapping;
  streamMapping: StreamMapping;
};

function StreamOverviewEditor({
  attributesMapping,
  selectedStreamMapping,
  setAttributesMapping,
  setSelectedStreamMapping,
  streamMapping,
}: StreamOverviewEditorProps) {
  const tableMemo = useMemo(() => (
    <StreamSettingsEditorTable
      attributes={[
        {
          label: () => 'Replication method',
          inputType: InputTypeEnum.SELECT,
          options: REPLICATION_METHODS_BATCH_PIPELINE.map(value => ({
            label: () => capitalizeRemoveUnderscoreLower(value),
            value: value,
          })),
          uuid: AttributeUUIDEnum.REPLICATION_METHOD,
        },
        {
          label: () => 'Unique conflict method',
          inputType: InputTypeEnum.SELECT,
          options: Object.values(UniqueConflictMethodEnum).map(v => ({
            label: () => capitalizeRemoveUnderscoreLower(v),
            value: v,
          })),
          uuid: AttributeUUIDEnum.UNIQUE_CONFLICT_METHOD,
        },
        {
          label: () => 'Run stream in parallel',
          inputType: InputTypeEnum.TOGGLE,
          uuid: AttributeUUIDEnum.RUN_IN_PARALLEL,
        },
        {
          label: () => 'Automatically add new columns',
          inputType: InputTypeEnum.TOGGLE,
          uuid: AttributeUUIDEnum.AUTO_ADD_NEW_FIELDS,
        },
        {
          label: () => 'Disable strict column type checks',
          inputType: InputTypeEnum.TOGGLE,
          uuid: AttributeUUIDEnum.DISABLE_COLUMN_TYPE_CHECK,
        },
      ]}
      attributesMapping={attributesMapping}
      columnFlex={[null, 1, 1]}
      rightAlignColumnForRowIndexes={[2, 3, 4]}
      setAttributesMapping={setAttributesMapping}
    />
  ), [
    attributesMapping,
    setAttributesMapping,
  ]);

  const streamsTableMemo = useMemo(() => {
    return (
      <StreamTableSelector
        selectedStreamMapping={selectedStreamMapping}
        setSelectedStreamMapping={setSelectedStreamMapping}
        streamMapping={streamMapping}
      />
    );
  }, [
    selectedStreamMapping,
    setSelectedStreamMapping,
    streamMapping,
  ]);

  return (
    <BackgroundStyle>
      <Spacing p={PADDING_UNITS}>
        <div>
          <Headline>
            Make changes to multiple streams
          </Headline>

          <Spacing mt={1}>
            <Text default>
              Clicking the Apply button below will use the values from the attributes below and
              change the values of those attributes for all the selected streams.
            </Text>
          </Spacing>
        </div>
      </Spacing>

      {tableMemo}

      {streamsTableMemo}
    </BackgroundStyle>
  );
}

export default StreamOverviewEditor;
