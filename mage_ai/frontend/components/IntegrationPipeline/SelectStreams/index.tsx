import { useState } from 'react';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Panel from '@oracle/components/Panel/v2';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import {
  CatalogType,
  StreamType,
} from '@interfaces/IntegrationSourceType';
import { indexBy } from '@utils/array';

type SelectStreamsProps = {
  catalog: CatalogType;
  isLoading: boolean;
  onActionCallback: (selectedStreams: {
    [key: string]: boolean;
  }) => void;
  streams: StreamType[];
};

function SelectStreams({
  catalog,
  isLoading,
  onActionCallback,
  streams,
}: SelectStreamsProps) {
  const selectedStreamsInit = indexBy(catalog?.streams || [], ({ stream }) => stream);
  const [selectedStreams, setSelectedStreams] = useState(selectedStreamsInit);

  return (
    <Panel>
      <Spacing p={2}>
        <Text>
          Select the streams you want to sync.
        </Text>
      </Spacing>

      <Table
        columnFlex={[null, null, 1]}
        columns={[
          {
            label: () => '',
            uuid: 'Selected',
          },
          {
            uuid: 'Stream',
          },
        ]}
        rows={streams.map((stream) => {
          const {
            stream: streamID,
          } = stream;
          const selected: boolean = !!selectedStreams[streamID];

          return [
            <Checkbox
              key={`selected-${streamID}`}
              checked={selected}
              onClick={() => {
                setSelectedStreams(prev => ({
                  ...prev,
                  [streamID]: selected ? null : stream,
                }));
              }}
            />,
            <Text key={`stream-${streamID}`}>
              {streamID}
            </Text>,
          ];
        })}
      />

      <Spacing p={2}>
        <Button
          loading={isLoading}
          onClick={() => onActionCallback(selectedStreams)}
          primary
          small
        >
          Save and continue
        </Button>
      </Spacing>
    </Panel>
  );
}

export default SelectStreams;
