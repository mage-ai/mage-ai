import moment from 'moment';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import AWSEMRClusterType, { ClusterStatusStateEnum } from '@interfaces/AWSEMRClusterType';
import Button from '@oracle/elements/Button';
import ComputeClusterType from '@interfaces/ComputeClusterType';
import ComputeServiceType from '@interfaces/ComputeServiceType';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  Check,
  ChevronDown,
  Close,
  PowerOnOffButton,
  WorkspacesUsersIcon,
} from '@oracle/icons';
import {
  DATE_FORMAT_LONG_MS,
  datetimeInLocalTimezone,
} from '@utils/date';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SubheaderStyle } from './index.style';
import { buildTable } from './utils';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { useError } from '@context/Error';

const ICON_SIZE = 2 * UNIT;

type ClustersType = {
  computeService: ComputeServiceType;
}

const TEXT_PROPS_SHARED = {
  default: true,
  monospace: true,
};

function Clusters({
  computeService,
}: ClustersType) {
  const componentUUID = useMemo(() => `${computeService?.uuid}/clusters`, [computeService]);
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const [selectedRowIndexInternal, setSelectedRowIndexInternal] = useState<number>(null);

  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const {
    data: dataComputeClusters,
    mutate: fetchComputeClusters,
  } = api.compute_clusters.compute_services.list(computeService?.uuid);

  const computeClusters: ComputeClusterType[] =
    useMemo(() => dataComputeClusters?.compute_clusters || [], [
      dataComputeClusters,
    ]);

  const clusters: AWSEMRClusterType[] =
    useMemo(() => computeClusters?.map(({ cluster }) => cluster), [
      computeClusters,
    ]);

  const [createCluster, { isLoading: isLoadingCreateCluster }] = useMutation(
    api.compute_clusters.compute_services.useCreate(computeService?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchComputeClusters().then(() => setSelectedRowIndexInternal(0));
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  return (
    <>
      <SubheaderStyle>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
          >
            <Headline level={4}>
              {pluralize('cluster', clusters?.length || 0, true)}
            </Headline>

            <Spacing mr={PADDING_UNITS} />

            <Button
              beforeIcon={<WorkspacesUsersIcon size={ICON_SIZE} />}
              loading={isLoadingCreateCluster}
              onClick={() => createCluster()}
              primary
            >
              Launch new cluster
            </Button>
          </FlexContainer>
        </Spacing>

        <Divider light />
      </SubheaderStyle>

      <Table
        apiForFetchingAfterAction={api.compute_clusters.compute_services.detail}
        buildApiOptionsFromObject={(object: any) => [computeService?.uuid, object?.id]}
        columnFlex={[null, null, null, null, null, null]}
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
            uuid: 'Created',
          },
          {
            center: true,
            uuid: 'Active',
          },
          {
            label: () => '',
            uuid: 'Details',
          },
        ]}
        onClickRow={(index: number, event?: any) => {
          if (typeof selectedRowIndexInternal !== 'undefined' && selectedRowIndexInternal !== null) {
            setSelectedRowIndexInternal(null);
          }
        }}
        renderExpandedRowWithObject={(rowIndex: number, object: any) => {
          const cluster = object?.compute_cluster?.cluster;

          if (!cluster) {
            return null;
          }

          const {
            active,
            applications,
            name,
            status,
            tags,
          } = cluster;
          const state = status?.state;

          const terminated = [
            ClusterStatusStateEnum.TERMINATED,
            ClusterStatusStateEnum.TERMINATED_WITH_ERRORS,
            ClusterStatusStateEnum.TERMINATING,
          ].includes(state);

          const ready = [
            ClusterStatusStateEnum.RUNNING,
            ClusterStatusStateEnum.WAITING,
          ].includes(state);

          return (
            <Spacing p={PADDING_UNITS}>
              {!terminated && (
                <>
                  <Panel noPadding>
                    <Spacing p={PADDING_UNITS}>
                      <Headline level={4}>
                        Actions
                      </Headline>
                    </Spacing>

                    <Divider light />

                    <Spacing p={PADDING_UNITS}>
                      <FlexContainer>
                        {ready && (
                          <>
                            <Button
                              beforeIcon={<PowerOnOffButton size={ICON_SIZE} />}
                              disabled={active}
                              primary={!active}
                            >
                              {active
                                ? 'Already activated'
                                : 'Activate cluster for compute'
                              }
                            </Button>

                            <Spacing mr={PADDING_UNITS} />

                            <Button
                              secondary
                            >
                              Terminate cluster
                            </Button>
                          </>
                        )}

                        {!ready && (
                          <FlexContainer alignItems="center">
                            <Spinner inverted small />

                            <Spacing mr={PADDING_UNITS} />

                            <Text large muted>
                              Cluster is still launching.
                            </Text>
                          </FlexContainer>
                        )}
                      </FlexContainer>
                    </Spacing>
                  </Panel>

                  <Spacing mb={PADDING_UNITS} />
                </>
              )}

              <Panel noPadding>
                <Spacing p={PADDING_UNITS}>
                  <Headline level={4}>
                    Details
                  </Headline>
                </Spacing>

                {[
                  {
                    key: 'Name',
                    value: name,
                  },
                  {
                    key: 'Status message',
                    value: status?.state_change_reason?.message,
                  },
                  {
                    key: 'Release label',
                    textProps: {
                      monospace: true,
                    },
                    value: cluster?.release_label,
                  },
                  {
                    key: 'Service role',
                    textProps: {
                      monospace: true,
                    },
                    value: cluster?.service_role,
                  },
                  {
                    key: 'Scale down behavior',
                    value: cluster?.scale_down_behavior
                      ? capitalizeRemoveUnderscoreLower(cluster?.scale_down_behavior)
                      : cluster?.scale_down_behavior,
                  },
                  {
                    key: 'Auto terminate',
                    value: cluster?.auto_terminate
                      ? <Check size={ICON_SIZE} success />
                      : <Close danger size={ICON_SIZE} />,
                  },
                  {
                    key: 'Termination protected',
                    value: cluster?.termination_protected
                      ? <Check size={ICON_SIZE} success />
                      : <Close danger size={ICON_SIZE} />,
                  },
                  {
                    key: 'Visible to all users',
                    value: cluster?.visible_to_all_users
                      ? <Check size={ICON_SIZE} success />
                      : <Close danger size={ICON_SIZE} />,
                  },
                  {
                    key: 'EBS root volume size',
                    textProps: {
                      monospace: true,
                    },
                    value: cluster?.ebs_root_volume_size,
                  },
                  {
                    key: 'Normalized instance hours',
                    textProps: {
                      monospace: true,
                    },
                    value: cluster?.normalized_instance_hours,
                  },
                  {
                    key: 'Step concurrency level',
                    textProps: {
                      monospace: true,
                    },
                    value: cluster?.step_concurrency_level,
                  },
                ].map(({
                  key,
                  textProps,
                  value,
                }: {
                  key: string;
                  textProps?: {
                    monospace?: boolean;
                  };
                  value: any;
                }) => (
                  <div key="">
                    <Divider light />

                    <Spacing p={PADDING_UNITS}>
                      <FlexContainer alignItems="center">
                        <FlexContainer flexDirection="column">
                          <Text
                            default
                            large
                          >
                            {key}
                          </Text>
                        </FlexContainer>

                        <Spacing mr={PADDING_UNITS} />

                        <Flex flex={1} justifyContent="flex-end">
                          <Text default large {...textProps}>
                            {value}
                          </Text>
                        </Flex>
                      </FlexContainer>
                    </Spacing>
                  </div>
                ))}
              </Panel>

              <Spacing mb={PADDING_UNITS} />

              <FlexContainer>
                <Panel noPadding>
                  <Spacing px={PADDING_UNITS} py={PADDING_UNITS}>
                    <Headline level={4}>
                      Applications
                    </Headline>
                  </Spacing>

                  <Divider light short />

                  {buildTable(applications || [])}
                </Panel>

                <Spacing mr={PADDING_UNITS} />

                <Panel noPadding>
                  <Spacing px={PADDING_UNITS} py={PADDING_UNITS}>
                    <Headline level={4}>
                      Tags
                    </Headline>
                  </Spacing>

                  <Divider light short />

                  {buildTable(tags || [])}
                </Panel>
              </FlexContainer>
            </Spacing>
          );
        }}
        getObjectAtRowIndex={(rowIndex: number) => clusters?.[rowIndex]}
        rows={clusters?.map(({
          active,
          id,
          name,
          status,
        }) => {
          const createdAt = status?.timeline?.creation_date_time;
          const state = status?.state;

          let displayName = name;
          if (displayName?.length > 30) {
            displayName = `${displayName.slice(0, 30)}...`;
          }

          return [
            <Text {...TEXT_PROPS_SHARED} key="id">
              {id}
            </Text>,
            <Text {...TEXT_PROPS_SHARED} key="name" monospace={false} title={name}>
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
              {status?.state ? capitalizeRemoveUnderscoreLower(status?.state) : status?.state}
            </Text>,
            <Text {...TEXT_PROPS_SHARED} key="created">
              {createdAt
                ? datetimeInLocalTimezone(
                  moment(createdAt).format(DATE_FORMAT_LONG_MS),
                  displayLocalTimezone,
                )
                : '-'
               }
            </Text>,
            <FlexContainer
              justifyContent="center"
              key="active"
            >
              <PowerOnOffButton muted={!active} size={ICON_SIZE} success={active} />
            </FlexContainer>,
            <FlexContainer
              justifyContent="flex-end"
              key="details"
            >
              <Button
                basic
                iconOnly
                noBackground
                noPadding
                onClick={() => true}
              >
                <ChevronDown
                  muted
                  size={ICON_SIZE}
                />
              </Button>
            </FlexContainer>,
          ];
        })}
        selectedRowIndexInternal={selectedRowIndexInternal}
        uuid={componentUUID}
      />

      {!dataComputeClusters && (
        <Spacing p={PADDING_UNITS}>
          <Spinner inverted />
        </Spacing>
      )}
    </>
  );
}

export default Clusters;
