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
import ComputeServiceType from '@interfaces/ComputeServiceType';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PowerOnOffButton } from '@oracle/icons';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

type ConnectionSettingsProps = {
  computeService: ComputeServiceType;
  connections: ComputeConnectionType[];
  fetchComputeConnections: () => void;
  fetchComputeService: () => void;
}

function ConnectionSettings({
  computeService,
  connections,
  fetchComputeConnections,
  fetchComputeService,
}: ConnectionSettingsProps) {
  const [showError] = useError(null, {}, [], {
    uuid: 'ConnectionSettings',
  });

  const [connectionActionUpdating, setConnectionActionUpdating] = useState<{
    action: ComputeConnectionActionType;
    connection: ComputeConnectionType;
  }>(null);
  const [updateComputeConnection, { isLoading: isLoadingComputeConnection }]: any = useMutation(
    ({
      action,
      connection,
      id,
    }: {
      action: ComputeConnectionActionUUIDEnum;
      connection: AWSEMRClusterType | SSHTunnelType;
      id: ComputeConnectionUUIDEnum;
    }) => api.compute_connections.compute_services.useUpdate(computeService?.uuid, id)({
      compute_connection: {
        action,
        connection,
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            project: objectServer,
          }) => {
            fetchComputeService();
            fetchComputeConnections();
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
    <Spacing mb={PADDING_UNITS}>
      {connections?.map((connection) => {
        const {
          actions,
          active,
          connection: connectionModel,
          description,
          id,
          name,
        } = connection;

        return (
          <Spacing key={id} mt={PADDING_UNITS} px={PADDING_UNITS}>
            <Panel noPadding>
              <Spacing p={PADDING_UNITS}>
                <FlexContainer>
                  <Flex flex={1} flexDirection="column">
                    <Headline level={4}>
                      {name}
                    </Headline>

                    {description && (
                      <Spacing mt={1}>
                        <Text default>
                          {description}
                        </Text>
                      </Spacing>
                    )}
                  </Flex>

                  <Spacing mr={PADDING_UNITS} />

                  <PowerOnOffButton
                    muted={!active}
                    size={2.5 * UNIT}
                    success={active}
                  />
                </FlexContainer>
              </Spacing>

              {actions?.length >= 1 && (
                <>
                  <Divider light />

                  <Spacing p={PADDING_UNITS}>
                    <FlexContainer alignItems="center">
                      {actions?.map(({
                        name,
                        uuid,
                      }) => (
                        <Spacing key={uuid} mr={1}>
                          <Button
                            danger={[
                              ComputeConnectionActionUUIDEnum.DELETE,
                            ].includes(uuid)}
                            loading={isLoadingComputeConnection
                              && connectionActionUpdating?.computeConnection?.id === id
                              && connectionActionUpdating?.computeConnectionAction?.uuid === uuid
                            }
                            onClick={() => {
                              setConnectionActionUpdating({
                                action: {
                                  name,
                                  uuid,
                                },
                                connection: connectionModel,
                              });

                              updateComputeConnection({
                                action: uuid,
                                connection: connectionModel,
                                id,
                              });
                            }}
                            primary={[
                              ComputeConnectionActionUUIDEnum.CREATE,
                              ComputeConnectionActionUUIDEnum.UPDATE,
                            ].includes(uuid)}
                            secondary={[
                              ComputeConnectionActionUUIDEnum.DESELECT,
                            ].includes(uuid)}
                          >
                            {name}
                          </Button>
                        </Spacing>
                      ))}
                    </FlexContainer>
                  </Spacing>
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
