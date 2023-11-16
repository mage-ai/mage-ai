import NextLink from 'next/link';
import { toast } from 'react-toastify';
import { useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import AWSEMRClusterType, { ClusterStatusStateEnum } from '@interfaces/AWSEMRClusterType';
import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
import useComputeService from '@utils/models/computeService/useComputeService'
import { ExpandOpenUpRight, PowerOnOffButton, WorkspacesUsersIcon } from '@oracle/icons';
import { MainNavigationTabEnum } from '@components/ComputeManagement/constants';
import { MenuStyle } from './index.style'
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { selectKeys } from '@utils/hash';
import { useError } from '@context/Error';

const ICON_SIZE = 2 * UNIT;
const TEXT_PROPS_SHARED = {
  default: true,
  monospace: true,
  small: true,
};

function ClusterSelection() {
  const popupRef = useRef(null);

  const [showError] = useError(null, {}, [], {
    uuid: 'ClusterSelection',
  });

  const [includeAllStates, setIncludeAllStates] = useState(false);

  const {
    activeCluster,
    clusters,
    clustersLoading,
    computeService,
    fetchComputeClusters,
  } = useComputeService({
    clustersRefreshInterval: 5000,
    includeAllStates,
  });

  const [popupSettings, setPopupSettings] = useState<{
    message: string;
    x: number;
    y: number;
  }>(null);

  const [createCluster, { isLoading: isLoadingCreateCluster }] = useMutation(
    api.compute_clusters.compute_services.useCreate(computeService?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchComputeClusters();
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
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
            fetchComputeClusters();
            setPopupSettings(null);
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
      Launch cluster
    </Button>
  ), [
    clustersCount,
    createCluster,
    isLoadingCreateCluster,
  ]);

  const popupMemo = useMemo(() => {
    const {
      message,
      x,
      y,
    } = popupSettings || {
      message: null,
      x: 0,
      y: 0,
    };

    const messageEl = (
      <Text default small>
        {message}
      </Text>
    );

    return (
      <div
        ref={popupRef}
        style={{
          // @ts-ignore
          hidden: !popupSettings,
          left: x - (popupRef?.current?.getBoundingClientRect()?.width || 0),
          maxWidth: 30 * UNIT,
          position: 'fixed',
          top: y - (popupRef?.current?.getBoundingClientRect()?.height || 0),
          zIndex: 9999,
        }}
      >
        <Panel dark noPadding>
          <Spacing p={1}>
            {isLoadingUpdateCluster && (
              <FlexContainer alignItems="center">
                <Spinner inverted small />

                <Spacing mr={1} />

                {messageEl}
              </FlexContainer>
            )}

            {!isLoadingUpdateCluster && messageEl}
          </Spacing>
        </Panel>
      </div>
    );
  }, [
    isLoadingUpdateCluster,
    popupSettings,
    setPopupSettings,
  ]);

  return (
    <>
      {popupMemo}

      <MenuStyle>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <FlexContainer
              flexDirection="column"
            >
              <FlexContainer alignItems="center">
                <Text bold large>
                  {clustersLoading
                    ? 'Clusters'
                    : pluralize('cluster', clustersCount, true)
                  }
                </Text>

                <FlexContainer alignItems="center">
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
                </FlexContainer>
              </FlexContainer>

              <Spacing mt={1}>
                <Text default small>
                  {clustersCount >= 1 && 'Click a cluster to activate and use it for compute.'}
                  {!clustersCount && 'Launch a new cluster to use for compute.'}
                </Text>
              </Spacing>

              <Spacing mt={1}>
                <FlexContainer alignItems="center">
                  <Button
                    beforeIcon={<ExpandOpenUpRight default />}
                    default
                    linkProps={{
                      href: `/compute`,
                      as: `/compute?tab=${MainNavigationTabEnum.CLUSTERS}`,
                    }}
                    noBackground
                    noBold
                    noBorder
                    target="_blank"
                    noPadding
                    // @ts-ignore
                    openNewWindow
                    small
                  >
                    Open compute mangement
                  </Button>
                </FlexContainer>
              </Spacing>
            </FlexContainer>

            <Spacing mr={PADDING_UNITS} />

            {clustersCount >= 1 && (
              <FlexContainer flexDirection="column">
                {launchClusterButton}
              </FlexContainer>
            )}
          </FlexContainer>
        </Spacing>

        <Divider light />

        <ClickOutside
          onClickOutside={() => {
            if (!isLoadingUpdateCluster) {
              setPopupSettings(null);
            }
          }}
          open
        >
          <Table
            columnFlex={[null, null, null]}
            columns={[
              {
                uuid: 'ID',
              },
              {
                uuid: 'State',
              },
              {
                label: () => '',
                rightAligned: true,
                uuid: 'Active',
              },
            ]}
            onClickRow={(index: number, event: any) => {
              if (isLoadingUpdateCluster) {
                return;
              }

              const cluster = clusters?.[index];
              const state = cluster?.status?.state;

              let message;
              if (cluster?.active) {
                message = `Cluster ${cluster?.id} is already active.`;
              } else if ([
                ClusterStatusStateEnum.RUNNING,
                ClusterStatusStateEnum.WAITING,
              ].includes(state)) {
                message = `Activating cluster ${cluster?.id}.`;
                updateCluster({
                  ...cluster,
                  active: true,
                });
              } else {
                message = `
                  Cluster ${cluster?.id} must be in a
                  ${capitalizeRemoveUnderscoreLower(ClusterStatusStateEnum.WAITING)} or
                  ${capitalizeRemoveUnderscoreLower(ClusterStatusStateEnum.RUNNING)}
                  state to be activated and used for compute.
                `;
              }

              setPopupSettings({
                message,
                x: event.clientX,
                y: event.clientY,
              });
            }}
            rows={clusters?.map(({
              active,
              id,
              status,
            }) => {
              const state = status?.state;

              return [
                <Text {...TEXT_PROPS_SHARED} key="id">
                  {id}
                </Text>,
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
                </Text>,
                <FlexContainer
                  justifyContent="flex-end"
                  key="active"
                >
                  <PowerOnOffButton muted={!active} size={ICON_SIZE} success={active} />
                </FlexContainer>,
              ];
            })}
            stickyHeader
            uuid='ClusterSelection'
          />
        </ClickOutside>

        {!clustersLoading && clustersCount === 0 && (
          <Spacing p={PADDING_UNITS}>
            {launchClusterButton}
          </Spacing>
        )}

        {clustersLoading && (
          <Spacing p={PADDING_UNITS}>
            <Spinner inverted small />
          </Spacing>
        )}
      </MenuStyle>
    </>
  );
}

export default ClusterSelection;
