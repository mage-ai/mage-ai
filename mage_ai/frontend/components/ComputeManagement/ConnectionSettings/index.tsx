import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import AWSEMRClusterType from '@interfaces/AWSEMRClusterType';
import Button from '@oracle/elements/Button';
import ComputeConnectionType, {
  ComputeConnectionActionType,
  ComputeConnectionActionUUIDEnum,
  ComputeConnectionStateEnum,
  SSHTunnelType,
} from '@interfaces/ComputeConnectionType';
import ComputeServiceType, {
  SetupStepStatusEnum,
  SetupStepUUIDEnum,
} from '@interfaces/ComputeServiceType';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import SetupSteps from '../Clusters/SetupSteps';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PowerOnOffButton } from '@oracle/icons';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { buildTable } from '../utils';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

type ConnectionSettingsProps = {
  actionsOnly?: boolean;
  computeService: ComputeServiceType;
  computeConnections: ComputeConnectionType[];
  contained?: boolean;
  fetchAll?: () => void;
  hideDetails?: boolean;
  onClickStep?: (tab: string) => void;
  small?: boolean;
}

function ConnectionSettings({
  actionsOnly,
  computeService,
  computeConnections,
  contained = true,
  fetchAll,
  hideDetails,
  onClickStep,
  small,
}: ConnectionSettingsProps) {
  const [showError] = useError(null, {}, [], {
    uuid: 'ConnectionSettings',
  });

  const [connectionActionUpdating, setConnectionActionUpdating] = useState<{
    actionUUID: ComputeConnectionActionUUIDEnum;
    uuid: SetupStepUUIDEnum;
  }>(null);
  const [recentlyUpdatedConnection, setRecentlyUpdatedConnection] =
    useState<{
      actionUUID: ComputeConnectionActionUUIDEnum;
      computeConnection: ComputeConnectionType,
      uuid: SetupStepUUIDEnum;
    }>(null);

  const [updateComputeConnection, { isLoading: isLoadingComputeConnection }]: any = useMutation(
    ({
      action,
      uuid,
    }: {
      action: ComputeConnectionActionUUIDEnum;
      uuid: SetupStepUUIDEnum;
    }) => api.compute_connections.compute_services.useUpdate(computeService?.uuid, uuid)({
      compute_connection: {
        action,
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            compute_connection: objectServer,
          }) => {
            fetchAll?.();
            setRecentlyUpdatedConnection({
              ...connectionActionUpdating,
              computeConnection: objectServer,
            });
          },
          onErrorCallback: (response, errors) => {
            return showError({
              errors,
              response,
            });
          },
        },
      ),
    },
  );

  useEffect(() => {
    if (recentlyUpdatedConnection) {
      const computeConnection = computeConnections?.find(({
        uuid,
      }) => recentlyUpdatedConnection?.computeConnection?.uuid === uuid);
      if (computeConnection?.state !== recentlyUpdatedConnection?.computeConnection?.state) {
        setRecentlyUpdatedConnection(null);
      }
    }
  }, [
    computeConnections,
    recentlyUpdatedConnection,
    setRecentlyUpdatedConnection,
  ]);

  return (
    <Spacing py={contained ? PADDING_UNITS : 0}>
      {computeConnections?.map((computeConnection, idx1: number) => {
        const {
          actions,
          attributes,
          connection,
          description,
          name,
          required,
          status_calculated: status,
          steps,
          uuid,
        } = computeConnection;

        let attributesEl;
        if (!hideDetails
          && !actionsOnly
          && attributes
          && Object.keys(attributes || {})?.length >= 1
        ) {
          attributesEl = buildTable(Object.entries(attributes || {}).map(([k, v]) => [
            capitalizeRemoveUnderscoreLower(k),
            v,
          ]));
        }

        let connectionEl;
        if (!hideDetails
          && !actionsOnly
          && connection
          && Object.keys(connection || {})?.length >= 1
        ) {
          connectionEl = buildTable(Object.entries(connection || {}).map(([k, v]) => [
            capitalizeRemoveUnderscoreLower(k),
            v,
          ]));
        }

        const el = (
          <>
            {!actionsOnly && (
              <>
                <Spacing p={PADDING_UNITS}>
                  <FlexContainer>
                    <Flex flex={1} flexDirection="column">
                      <FlexContainer alignItems="center">
                        <Flex flex={1}>
                          <Headline level={small ? 5 : 4}>
                            {name}
                          </Headline>
                        </Flex>

                        <Spacing mr={PADDING_UNITS} />

                        <PowerOnOffButton
                          danger={SetupStepStatusEnum.ERROR === status}
                          muted={required && SetupStepStatusEnum.INCOMPLETE === status}
                          size={2 * UNIT}
                          success={!required || SetupStepStatusEnum.COMPLETED === status}
                        />
                      </FlexContainer>

                      {description && (
                        <Spacing mt={1}>
                          <Text default small={small}>
                            {description}
                          </Text>
                        </Spacing>
                      )}
                    </Flex>
                  </FlexContainer>
                </Spacing>

                {steps?.length >= 1 && (
                  <>
                    <Divider light />

                    <SetupSteps
                      contained={false}
                      onClickStep={onClickStep}
                      setupSteps={steps}
                      small={small}
                    />
                  </>
                )}
              </>
            )}

            {(attributesEl || connectionEl) && (
              <Spacing p={PADDING_UNITS}>
                <FlexContainer>
                  {attributesEl && (
                    <Panel noPadding>
                      <FlexContainer flexDirection="column">
                        <Spacing p={PADDING_UNITS}>
                          <Text bold large>
                            Attributes
                          </Text>
                        </Spacing>

                        <Divider light />

                        {attributesEl}

                        <Spacing mb={PADDING_UNITS} />
                      </FlexContainer>
                    </Panel>
                  )}

                  {attributesEl && connectionEl && <Spacing pr={PADDING_UNITS} />}

                  {connectionEl && (
                    <Panel noPadding>
                      <FlexContainer flexDirection="column">
                        <Spacing p={PADDING_UNITS}>
                          <Text bold large>
                            Connection
                          </Text>
                        </Spacing>

                        <Divider light />

                        {connectionEl}

                        <Spacing mb={PADDING_UNITS} />
                      </FlexContainer>
                    </Panel>
                  )}
                </FlexContainer>
              </Spacing>
            )}

            {actions?.length >= 1 && (
              <>
                {!actionsOnly && (
                  <Spacing p={PADDING_UNITS}>
                    <FlexContainer>
                      <Flex flex={1} flexDirection="column">
                        <FlexContainer alignItems="center">
                          <Flex flex={1}>
                            <Headline level={small ? 5 : 4}>
                              Actions
                            </Headline>
                          </Flex>
                        </FlexContainer>
                      </Flex>
                    </FlexContainer>
                  </Spacing>
                )}

                {actions?.map(({
                  description,
                  name,
                  uuid: actionUUID,
                }, idx: number) => {
                  const loading = (isLoadingComputeConnection
                    && connectionActionUpdating?.uuid === uuid
                    && connectionActionUpdating?.actionUUID === actionUUID
                  ) || ComputeConnectionStateEnum.PENDING === recentlyUpdatedConnection?.computeConnection?.state;

                  return (
                    <div key={actionUUID}>
                      {(!actionsOnly || idx >= 1) && <Divider light />}

                      <Spacing p={PADDING_UNITS}>
                        <FlexContainer alignItems="center" justifyContent="space-between">
                          <Flex flex={1} flexDirection="column">
                            <Text
                              default
                              large={!small}
                            >
                              {description}
                            </Text>

                            <Spacing mt={PADDING_UNITS}>
                              <Button
                                compact={small}
                                danger={[
                                  ComputeConnectionActionUUIDEnum.DELETE,
                                ].includes(actionUUID)}
                                loading={loading}
                                onClick={() => {
                                  setConnectionActionUpdating({
                                    actionUUID: actionUUID,
                                    uuid,
                                  });
                                  setRecentlyUpdatedConnection(null);

                                  updateComputeConnection({
                                    action: actionUUID,
                                    uuid,
                                  });
                                }}
                                primary={[
                                  ComputeConnectionActionUUIDEnum.CREATE,
                                  ComputeConnectionActionUUIDEnum.UPDATE,
                                ].includes(actionUUID)}
                                secondary={[
                                  ComputeConnectionActionUUIDEnum.DESELECT,
                                ].includes(actionUUID)}
                                small={small}
                              >
                                {name}
                              </Button>
                            </Spacing>
                          </Flex>
                        </FlexContainer>
                      </Spacing>
                    </div>
                  );
                })}
              </>
            )}
          </>
        );

        return (
          <Spacing key={uuid} mt={idx1 >= 1 ? PADDING_UNITS : 0} px={contained ? PADDING_UNITS : 0}>
            {contained && (
              <Panel noPadding>
                {el}
              </Panel>
            )}

            {!contained && el}
          </Spacing>
        );
      })}
    </Spacing>
  );
}

export default ConnectionSettings;
