import moment from 'moment';
import { useMemo } from 'react';

import AWSEMRClusterType, { ClusterStatusStateEnum } from '@interfaces/AWSEMRClusterType';
import ComputeServiceType from '@interfaces/ComputeServiceType';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  DATE_FORMAT_LONG_MS,
  datetimeInLocalTimezone,
} from '@utils/date';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type ClustersType = {
  computeService: ComputeServiceType;
}

const TEXT_PROPS_SHARED = {
  default: true,
  monospace: true,
};

function Clusters({
  computeService: computeServiceProp,
}: ClustersType) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const {
    data: dataComputeService,
    mutate: fetchComputeService,
  } = api.compute_services.detail(computeServiceProp?.uuid, {
    with_clusters: true,
  }, {}, {
    key: `compute_services/${computeServiceProp?.uuid}/with_clusters`,
  });

  const computeService: ComputeServiceType = useMemo(() => ({
    ...computeServiceProp,
    ...(dataComputeService?.compute_service || {}),
  }), [
    computeServiceProp,
    dataComputeService,
  ]);

  const clusters: AWSEMRClusterType[] = useMemo(() => computeService?.clusters?.clusters || [], [
    computeService,
  ]);

  return (
    <Table
      columnFlex={[null, null, null, null, null]}
      columns={[
        {
          uuid: 'ID',
        },
        {
          uuid: 'Name',
        },
        {
          uuid: 'State',
        },
        {
          uuid: 'Status',
        },
        {
          // 2023-11-11T07:48:05.007000+00:00
          rightAligned: true,
          uuid: 'Created',
        },
      ]}
      rows={clusters?.map(({
        id,
        name,
        status,
      }) => {
        const createdAt = status?.timeline?.creation_date_time;
        const state = status?.state;

        let displayName = name;
        if (displayName?.length > 40) {
          displayName = `${displayName.slice(0, 40)}...`;
        }

        return [
          <Text {...TEXT_PROPS_SHARED} key="id">
            {id}
          </Text>,
          <Text {...TEXT_PROPS_SHARED} key="name" title={name}>
            {displayName}
          </Text>,
          <Text
            {...TEXT_PROPS_SHARED}
            danger={[
              ClusterStatusStateEnum.TERMINATED,
              ClusterStatusStateEnum.TERMINATED_WITH_ERRORS,
              ClusterStatusStateEnum.TERMINATING,
            ].includes(state)}
            success={ClusterStatusStateEnum.WAITING === state}
            warning={ClusterStatusStateEnum.RUNNING === state}
            key="state"
          >
            {status?.state}
          </Text>,
          <Text {...TEXT_PROPS_SHARED} key="status" monospace={false}>
            {status?.state_change_reason?.message}
          </Text>,
          <Text {...TEXT_PROPS_SHARED} key="created" rightAligned>
            {createdAt
              ? datetimeInLocalTimezone(
                moment(createdAt).format(DATE_FORMAT_LONG_MS),
                displayLocalTimezone,
              )
              : '-'
             }
          </Text>,
        ];
      })}
    />
  );
}

export default Clusters;
