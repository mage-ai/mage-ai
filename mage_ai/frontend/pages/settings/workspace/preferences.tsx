import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Checkbox from '@oracle/elements/Checkbox';
import Col from '@components/shared/Grid/Col';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType from '@interfaces/ProjectType';
import Row from '@components/shared/Grid/Row';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
import { LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS } from '@storage/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SECTION_ITEM_UUID_PREFERENCES,
  SECTION_UUID_WORKSPACE,
} from '@components/settings/Dashboard/constants';
import { get, set } from '@storage/localStorage';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

function Preferences() {
  const [automaticallyNameBlocks, setAutomaticallyNameBlocks] = useState<boolean>(
    !!get(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS),
  );
  const [showError] = useError(null, {}, [], {
    uuid: 'settings/workspace/preferences',
  });

  const { data, mutate: fetchProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => data?.projects?.[0], [data]);
  const {
    help_improve_mage: helpImproveMage,
    name: projectName,
    project_uuid: projectUUID,
  } = project || {};

  const [updateProjectBase, { isLoading: isLoadingUpdateProject }]: any = useMutation(
    api.projects.useUpdate(projectName),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchProjects();
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const updateProject = useCallback((payload: {
    help_improve_mage?: boolean;
  }) => updateProjectBase({
    project: payload,
  }), [updateProjectBase]);

  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_PREFERENCES}
      uuidWorkspaceSelected={SECTION_UUID_WORKSPACE}
    >
      <Spacing p={PADDING_UNITS}>
        <Row justifyContent="center">
          <Col
            xl={8}
            xxl={6}
          >
            <Panel noPadding>
              <Spacing p={PADDING_UNITS}>
                <Spacing mb={1}>
                  <Headline level={5}>
                    Project name
                  </Headline>
                </Spacing>

                <Text default monospace>
                  {projectName}
                </Text>
              </Spacing>

              <Divider light />

              <Spacing p={PADDING_UNITS}>
                <Spacing mb={1}>
                  <Headline level={5}>
                    Project UUID
                  </Headline>
                </Spacing>

                <Text default={!!projectUUID} monospace muted={!projectUUID}>
                  {projectUUID || 'Not required'}
                </Text>
              </Spacing>

              <Divider light />

              <Spacing p={PADDING_UNITS}>
                <FlexContainer
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Flex flexDirection="column">
                    <Spacing mb={1}>
                      <Headline level={5}>
                        Help improve Mage
                      </Headline>
                    </Spacing>

                    <Text default>
                      Please contribute usage statistics to help improve the developer experience
                      for you and everyone in the community. Learn more <Link
                        href="https://docs.mage.ai/contributing/statistics/overview"
                        openNewWindow
                      >
                        here
                      </Link>.
                    </Text>
                  </Flex>

                  <Spacing mr={PADDING_UNITS} />

                  <ToggleSwitch
                    checked={helpImproveMage}
                    onCheck={() => {
                      updateProject({
                        help_improve_mage: !helpImproveMage,
                      });
                    }}
                  />
                </FlexContainer>
              </Spacing>

              <Divider light />

              <Spacing p={PADDING_UNITS}>
                <Spacing mb={1}>
                  <Headline level={5}>
                    Automatically generate block names
                  </Headline>
                </Spacing>

                <FlexContainer alignItems="center">
                  <Checkbox
                    checked={automaticallyNameBlocks}
                    label="Use randomly generated names for blocks created in the future"
                    onClick={() => {
                      setAutomaticallyNameBlocks(!automaticallyNameBlocks);
                      set(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS, !automaticallyNameBlocks);
                    }}
                  />
                </FlexContainer>
              </Spacing>

              {isLoadingUpdateProject && (
                <Spacing p={PADDING_UNITS}>
                  <Spinner inverted />
                </Spacing>
              )}
            </Panel>
          </Col>
        </Row>
      </Spacing>
    </SettingsDashboard>
  );
}

Preferences.getInitialProps = async () => ({});

export default PrivateRoute(Preferences);
