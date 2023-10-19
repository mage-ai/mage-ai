import { useMemo } from 'react';

import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { NodeHeaderStyle, NodeStyle } from './index.style';
import { SHARED_TEXT_PROPS } from '../constants';
import { SparkSQLNodeMetricType } from '@interfaces/SparkType';

function GraphNode({
  height,
  node,
}) {
  const metrics: SparkSQLNodeMetricType[] = useMemo(() => node?.metrics || [], node);
  const metricsMemo = useMemo(() => (
    <Table
      columnFlex={[null, null]}
      columns={[
        {
          uuid: 'Metric',
        },
        {
          rightAligned: true,
          uuid: 'Value',
        },
      ]}
      rows={metrics?.map(({
        name,
        value,
      }) => [
        <Text {...SHARED_TEXT_PROPS} key="name">
          {name}
        </Text>,
        <Text {...SHARED_TEXT_PROPS} key="value" rightAligned>
          {value}
        </Text>,
      ])}
    />
  ), [
    metrics,
  ]);

  return (
    <NodeStyle height={height}>
      <NodeHeaderStyle>
        <Text monospace>
          {node?.node_name}
        </Text>
      </NodeHeaderStyle>

      {metrics?.length >= 1 && metricsMemo}
    </NodeStyle>
  );
}

export default GraphNode;
