import { useCallback, useState } from 'react';
import { useMutation } from 'react-query';

import AWSEMRClusterType from '@interfaces/AWSEMRClusterType';
import Button from '@oracle/elements/Button';
import ComputeConnectionType, {
  ComputeConnectionActionType,
  ComputeConnectionActionUUIDEnum,
  ComputeConnectionUUIDEnum,
  SSHTunnelType,
} from '@interfaces/ComputeConnectionType';
import ComputeServiceType, { SetupStepStatusEnum } from '@interfaces/ComputeServiceType';
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
  computeService: ComputeServiceType;
  computeConnections: ComputeConnectionType[];
  fetchAll: () => void;
  onClickStep?: (tab: string) => void;
}

function ConnectionSettings({
  computeService,
  computeConnections,
  fetchAll,
  onClickStep,
}: ConnectionSettingsProps) {
  const [showError] = useError(null, {}, [], {
    uuid: 'ConnectionSettings',
  });

  const [connectionActionUpdating, setConnectionActionUpdating] = useState<{
    actionUUID: ComputeConnectionActionType;
    uuid: ComputeConnectionUUIDEnum;
  }>(null);
  const [updateComputeConnection, { isLoading: isLoadingComputeConnection }]: any = useMutation(
    ({
      action,
      uuid,
    }: {
      action: ComputeConnectionActionUUIDEnum;
      uuid: ComputeConnectionUUIDEnum;
    }) => api.compute_connections.compute_services.useUpdate(computeService?.uuid, uuid)({
      compute_connection: {
        action,
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            project: objectServer,
          }) => {
            fetchAll();
            setConnectionActionUpdating(null);
          },
          onErrorCallback: (response, errors) => {
            setConnectionActionUpdating(null);

            return showError({
              errors,
              response,
            });
          },
        },
      ),
    },
  );

  return (
    <Spacing py={PADDING_UNITS}>
      {computeConnections?.map((computeConnection) => {
        const {
          actions,
          attributes,
          connection,
          description,
          name,
          required,
          status,
          steps,
          uuid,
        } = computeConnection;

        let attributesEl;
        if (attributes && Object.keys(attributes || {})?.length >= 1) {
          attributesEl = buildTable(Object.entries(attributes || {}).map(([k, v]) => [
            capitalizeRemoveUnderscoreLower(k),
            v,
          ]));
        }

        let connectionEl;
        if (connection && Object.keys(connection || {})?.length >= 1) {
          connectionEl = buildTable(Object.entries(connection || {}).map(([k, v]) => [
            capitalizeRemoveUnderscoreLower(k),
            v,
          ]));
        }

        return (
          <Spacing key={uuid} mb={PADDING_UNITS} px={PADDING_UNITS}>
            <Panel noPadding>
              <Spacing p={PADDING_UNITS}>
                <FlexContainer>
                  <Flex flex={1} flexDirection="column">
                    <FlexContainer alignItems="center">
                      <Flex flex={1}>
                        <Headline level={4}>
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
                        <Text default>
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
                  />
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
                  <Spacing p={PADDING_UNITS}>
                    <FlexContainer>
                      <Flex flex={1} flexDirection="column">
                        <FlexContainer alignItems="center">
                          <Flex flex={1}>
                            <Headline level={4}>
                              Actions
                            </Headline>
                          </Flex>
                        </FlexContainer>
                      </Flex>
                    </FlexContainer>
                  </Spacing>

                  {actions?.map(({
                    description,
                    name,
                    uuid: actionUUID,
                  }) => (
                    <div key={actionUUID}>
                      <Divider light />

                      <Spacing p={PADDING_UNITS}>
                        <FlexContainer alignItems="center" justifyContent="space-between">
                          <Flex flex={1} flexDirection="column">
                            <Text
                              default
                              large
                            >
                              {description}
                            </Text>

                            <Spacing mt={PADDING_UNITS}>
                              <Button
                                danger={[
                                  ComputeConnectionActionUUIDEnum.DELETE,
                                ].includes(actionUUID)}
                                loading={isLoadingComputeConnection
                                  && connectionActionUpdating?.uuid === uuid
                                  && connectionActionUpdating?.actionUUID === actionUUID
                                }
                                onClick={() => {
                                  setConnectionActionUpdating({
                                    actionUUID: actionUUID,
                                    uuid,
                                  });

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
                              >
                                {name}
                              </Button>
                            </Spacing>
                          </Flex>
                        </FlexContainer>
                      </Spacing>
                    </div>
                  ))}
                </>
              )}
            </Panel>
          </Spacing>
        );
      })}
    </Spacing>
  );
}

export default ConnectionSettings;
