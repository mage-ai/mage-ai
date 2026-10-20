import moment from 'moment';
import { toast } from 'react-toastify';
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
import InformationTable from './InformationTable';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
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
import { pauseEvent } from '@utils/events';
import { selectKeys } from '@utils/hash';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { useError } from '@context/Error';

const ICON_SIZE = 2 * UNIT;

const TEXT_PROPS_SHARED = {
  default: true,
  monospace: true,
};

type ClustersProp = {
  clusters: AWSEMRClusterType[];
  computeService: ComputeServiceType;
  fetchAll: () => Promise<any>;
  includeAllStates?: boolean;
  loading?: boolean;
  setIncludeAllStates?: (value: boolean) => void;
}

function Clusters({
  clusters,
  computeService,
  fetchAll,
  includeAllStates,
  loading,
  setIncludeAllStates,
}: ClustersProp) {
  const componentUUID = useMemo(() => `${computeService?.uuid}/clusters`, [computeService]);
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const [selectedRowIndexInternal, setSelectedRowIndexInternal] = useState<number>(null);

  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const [createCluster, { isLoading: isLoadingCreateCluster }] = useMutation(
    api.compute_clusters.compute_services.useCreate(computeService?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchAll().then(() => setSelectedRowIndexInternal(0));
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [deleteCluster, { isLoading: isLoadingDeleteCluster }] = useMutation(
    (cluster: AWSEMRClusterType) => api.compute_clusters.compute_services.useDelete(
      computeService?.uuid,
      cluster?.id,
    )(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchAll().then(() => setSelectedRowIndexInternal(null));
          },
          onErrorCallback: ({
            error: {
              errors,
              exception,
              message,
              type,
            },
          }) => {
            toast.error(
              errors?.error || exception || message,
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: type,
              },
            );
          },
        },
      ),
    },
  );

  const [updateCluster, { isLoading: isLoadingUpdateCluster }] = useMutation(
    (cluster: AWSEMRClusterType) => api.compute_clusters.compute_services.useUpdate(
      computeService?.uuid,
      cluster?.id,
    )({
      compute_cluster: selectKeys(cluster, [
        'active',
      ]),
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchAll();
          },
          onErrorCallback: ({
            error: {
              errors,
              exception,
              message,
              type,
            },
          }) => {
            toast.error(
              errors?.error || exception || message,
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: type,
              },
            );
          },
        },
      ),
    },
  );

  const clustersCount = useMemo(() => clusters?.length || 0, [clusters]);

  const launchClusterButton = useMemo(() => (
    <Button
      beforeIcon={<WorkspacesUsersIcon size={ICON_SIZE} />}
      compact={clustersCount >= 1}
      loading={isLoadingCreateCluster}
      onClick={() => createCluster()}
      primary
      small={clustersCount >= 1}
    >
      Launch new cluster
    </Button>
  ), [
    clustersCount,
    createCluster,
    isLoadingCreateCluster,
  ]);

  return (
    <>
      <SubheaderStyle>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
          >
            <FlexContainer
              alignItems="center"
              justifyContent="space-between"
            >
              <Headline level={4}>
                {pluralize('cluster', clustersCount, true)}
              </Headline>

              {setIncludeAllStates && (
                <>
                  <Spacing mr={PADDING_UNITS} />

                  <ToggleSwitch
                    checked={includeAllStates as boolean}
                    compact
                    onCheck={(valFunc: (val: boolean) => boolean) => setIncludeAllStates(
                      valFunc(includeAllStates),
                    )}
                  />

                  <Spacing mr={1} />

                  <Text default={includeAllStates} muted={!includeAllStates} small>
                    Include terminated clusters
                  </Text>
                </>
              )}
            </FlexContainer>

            <Spacing mr={PADDING_UNITS} />

            {clustersCount >= 1 && launchClusterButton}
          </FlexContainer>
        </Spacing>

        <Divider light />
      </SubheaderStyle>

      <Table
        apiForFetchingAfterAction={api.compute_clusters.compute_services.detail}
        buildApiOptionsFromObject={(object: any) => [computeService?.uuid, object?.id, {}, {
          refreshInterval: 3000,
          revalidateOnFocus: true,
        }]}
        columnFlex={[null, null, null, null, null]}
        columns={[
          {
            uuid: 'Cluster ID',
          },
          {
            uuid: 'Cluster Name',
          },
          {
            uuid: 'Status',
          },
          {
            uuid: 'Created',
          },
          {
            center: true,
            uuid: 'Hours',
          },
          {
            label: () => '',
            rightAligned: true,
            uuid: 'Active',
          },
        ]}
        onClickRow={(index: number, event?: any) => {
          setSelectedRowIndexInternal(prev => prev === index ? null : index);
        }}
        renderExpandedRowWithObject={(rowIndex: number, object: any) => {
          const cluster = object?.compute_cluster?.cluster;

          if (!cluster) {
            return (
              <Spacing p={PADDING_UNITS}>
                <Spinner inverted />
              </Spacing>
            );
          }

          const {
            active,
            applications,
            ec2_instance_attributes: ec2InstanceAttributes,
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

          const createdAt = status?.timeline?.creation_date_time;

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
                              beforeIcon={<PowerOnOffButton size={ICON_SIZE} success={active} />}
                              loading={isLoadingUpdateCluster}
                              notClickable={active}
                              onClick={!active
                                ? () => updateCluster({
                                  ...cluster,
                                  active: true,
                                })
                                : null
                              }
                              primary={!active}
                            >
                              {active
                                ? 'Activated'
                                : 'Activate cluster for compute'
                              }
                            </Button>

                            <Spacing mr={PADDING_UNITS} />

                            <Button
                              loading={isLoadingDeleteCluster}
                              onClick={() => {
                                if (typeof window !== 'undefined'
                                  && window.confirm('Are you sure you want to terminate this cluster?')
                                ) {
                                  deleteCluster(cluster);
                                }
                              }}
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

                            <Text default large>
                              {status?.state_change_reason?.message || 'Cluster is still launching.'}
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

                <InformationTable
                  rows={[
                    {
                      key: 'ID',
                      textProps: {
                        monospace: true,
                      },
                      value: cluster?.id,
                    },
                    {
                      key: 'Name',
                      value: name,
                    },
                    {
                      key: 'Master public DNS name',
                      value: cluster?.master_public_dns_name || 'Available after cluster starts.',
                    },
                    {
                      key: 'Created at',
                      textProps: {
                        monospace: true,
                      },
                      value: createdAt
                        ? datetimeInLocalTimezone(
                          moment(createdAt).format(DATE_FORMAT_LONG_MS),
                          displayLocalTimezone,
                        )
                        : '-',
                    },
                    {
                      key: 'Status message',
                      value: status?.state_change_reason?.message || 'None',
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
                  ]}
                />
              </Panel>

              <Spacing mb={PADDING_UNITS} />

              <Panel noPadding>
                <Spacing p={PADDING_UNITS}>
                  <Headline level={4}>
                    EC2 instance attributes
                  </Headline>
                </Spacing>

                <InformationTable
                  rows={[
                    {
                      key: 'Availability zone',
                      textProps: {
                        monospace: true,
                      },
                      value: ec2InstanceAttributes?.ec2_availability_zone,
                    },
                    {
                      key: 'Master security group',
                      textProps: {
                        monospace: true,
                      },
                      value: ec2InstanceAttributes?.emr_managed_master_security_group,
                    },
                    {
                      key: 'Slave security group',
                      textProps: {
                        monospace: true,
                      },
                      value: ec2InstanceAttributes?.emr_managed_slave_security_group,
                    },
                    {
                      key: 'IAM profile',
                      textProps: {
                        monospace: true,
                      },
                      value: ec2InstanceAttributes?.iam_instance_profile,
                    },
                  ]}
                />
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
        rows={clusters?.map((cluster) => {
          const {
            active,
            id,
            name,
            normalized_instance_hours: normalizedInstanceHours,
            status,
          } = cluster;

          const createdAt = status?.timeline?.creation_date_time;
          const state = status?.state;
          const stateChangeReasonMessage = status?.state_change_reason?.message;
          const settingUp = [
            ClusterStatusStateEnum.BOOTSTRAPPING,
            ClusterStatusStateEnum.STARTING,
          ].includes(state);
          const tearingDown = [
            ClusterStatusStateEnum.TERMINATING,
          ].includes(state);

          return [
            <Text
              {...TEXT_PROPS_SHARED}
              key="id"
              success={active}
            >
              {id}
            </Text>,
            <Text
              {...TEXT_PROPS_SHARED}
              key="name"
              monospace={false}
              preWrap
            >
              {name}
            </Text>,
            <div key="state">
              <Text
                {...TEXT_PROPS_SHARED}
                danger={[
                  ClusterStatusStateEnum.TERMINATED_WITH_ERRORS,
                ].includes(state)}
                default={[
                    ClusterStatusStateEnum.STARTING,
                  ].includes(state)}
                muted={[
                  ClusterStatusStateEnum.TERMINATED,
                ].includes(state)}
                success={[
                  ClusterStatusStateEnum.RUNNING,
                  ClusterStatusStateEnum.WAITING,
                ].includes(state)}
                warning={[
                  ClusterStatusStateEnum.TERMINATING,
                ].includes(state)}
              >
                {status?.state ? capitalizeRemoveUnderscoreLower(status?.state) : status?.state}
              </Text>

              {stateChangeReasonMessage && (
                <Text muted preWrap small>
                  {stateChangeReasonMessage}
                </Text>
              )}
            </div>,
            <Text {...TEXT_PROPS_SHARED} key="created" preWrap>
              {createdAt
                ? datetimeInLocalTimezone(
                  moment(createdAt).format(DATE_FORMAT_LONG_MS),
                  displayLocalTimezone,
                )
                : '-'
               }
            </Text>,
            <Text
              {...TEXT_PROPS_SHARED}
              center
              key="normalizedInstanceHours"
            >
              {normalizedInstanceHours || 0}
            </Text>,
            <FlexContainer
              justifyContent="flex-end"
              key="active"
            >
              {(settingUp || tearingDown)
                ? <Spinner inverted={settingUp} small />
                : (
                  <Button
                    iconOnly
                    loading={isLoadingUpdateCluster}
                    noBackground
                    noBorder
                    noPadding
                    notClickable={active}
                    onClick={!active
                      ? (e) => {
                        pauseEvent(e);
                        updateCluster({
                          ...cluster,
                          active: true,
                        });
                      }
                      : null
                    }
                  >
                    <PowerOnOffButton
                      muted={!active}
                      size={ICON_SIZE}
                      success={active}
                    />
                  </Button>
                )
              }
            </FlexContainer>,
          ];
        })}
        selectedRowIndexInternal={selectedRowIndexInternal}
        uuid={componentUUID}
      />

      {loading && (
        <Spacing p={PADDING_UNITS}>
          <Spinner inverted />
        </Spacing>
      )}

      {!loading && !clustersCount && (
        <Spacing p={PADDING_UNITS}>
          {launchClusterButton}
        </Spacing>
      )}
    </>
  );
}

export default Clusters;
