import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { toast } from 'react-toastify';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import PlatformType from '@interfaces/PlatformType';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import useProject from '@utils/models/project/useProject';
import { Add, Save } from '@oracle/icons';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { addUnderscores, randomNameGenerator } from '@utils/string';
import { ignoreKeys, isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

function Settings() {
  const [showError] = useError(null, {}, [], {
    uuid: 'Platform/Settings',
  });

  const {
    project,
    rootProject,
  } = useProject();

  const [attributes, setAttributesState] = useState<PlatformType>(null);
  const [attributesTouched, setAttributesTouched] = useState<boolean>(false);
  const [activeProjectName, setActiveProjectName] = useState(null);

  const setAttributes = useCallback((prev) => {
    setAttributesState(prev);
    setAttributesTouched(true);
  }, [
    setAttributesState,
    setAttributesTouched,
  ]);

  useEffect(() => {
    if (rootProject && !attributes) {
      setAttributesState(rootProject?.platform_settings);
    }

    if (project && !activeProjectName) {
      setActiveProjectName(project?.name);
    }
  }, [
    rootProject,
  ]);

  const addButtonMemo = useMemo(() => {
    const projectName = addUnderscores(randomNameGenerator());

    return (
      <Button
        beforeIcon={<Add />}
        compact
        onClick={() => setAttributes(prev => ({
          ...prev,
          projects: {
            ...attributes?.projects,
            [projectName]: {},
          },
        }))}
        secondary
        small
      >
        Register project
      </Button>
    );
  }, [
    attributes,
  ]);

  const [updateProject, { isLoading: isLoadingUpdateProject }] = useMutation(
    api.projects.useUpdate(rootProject?.name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            project: objectServer,
          }) => {
            setAttributes(prev => ({
              ...prev,
              ...objectServer,
              features: {
                ...prev?.features,
                override: !!objectServer?.features_override && !isEmptyObject(objectServer?.features_override),
              }
            }));

            toast.success(
              'Platform settings successfully saved.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `platform-settings-success-${objectServer?.name}`,
              },
            );
          },
        },
      ),
    },
  );

  return (
    <Spacing p={PADDING_UNITS}>
      <SetupSection
        headerChildren={(
          <>
            <Spacing ml={PADDING_UNITS} />

            {addButtonMemo}
          </>
        )}
        title="Projects"
      >
        <Accordion
          noBorder
          noBoxShadow
          visibleMappingForced={Object.keys(attributes?.projects || {}).reduce((acc, key, idx) => ({
            ...acc,
            [String(idx)]: true,
          }), {})}
        >
          {Object.entries(attributes?.projects || {}).map(([
            projectName,
            projectSettings,
          ]) => {
            const {
              path,
              uuid,
            } = projectSettings;

            return (
              <AccordionPanel
                key={projectName}
                noBorderRadius
                noPaddingContent
                title={(
                  <FlexContainer alignItems="center">
                    <Text
                      large
                      monospace
                    >
                      {projectName}
                    </Text>
                  </FlexContainer>
                )}
                titleXPadding={PADDING_UNITS * UNIT}
                titleYPadding={PADDING_UNITS * UNIT}
              >
                <SetupSectionRow
                  description="Unique name of project."
                  textInput={{
                    fullWidth: false,
                    monospace: true,
                    onChange: e => setAttributes(prev => ({
                      ...prev,
                      projects: {
                        ...attributes?.projects,
                        [projectName]: {
                          ...projectSettings,
                          uuid: e.target.value,
                        },
                      },
                    })),
                    placeholder: projectName,
                    value: uuid,
                  }}
                  title="Name"
                />

                <SetupSectionRow
                  description={(
                    <Text muted small>
                      Relative path to the project directory starting from the root project directory.
                      <br />
                      If blank, the default path will be the project name.
                    </Text>
                  )}
                  textInput={{
                    fullWidth: false,
                    monospace: true,
                    onChange: e => setAttributes(prev => ({
                      ...prev,
                      projects: {
                        ...attributes?.projects,
                        [projectName]: {
                          ...projectSettings,
                          path: e.target.value,
                        },
                      },
                    })),
                    placeholder: projectName,
                    value: path || '',
                  }}
                  title="Path"
                />

                <SetupSectionRow
                  description="The currently selected project."
                  title="Currently selected project"
                  toggleSwitch={{
                    checked: projectName === activeProjectName,
                    onCheck: () => setActiveProjectName(
                      projectName === activeProjectName ? null : projectName,
                    ),
                  }}
                />

                <Divider light />

                <SetupSectionRow>
                  <Button
                    compact
                    noBorder
                    onClick={() => {
                      setAttributes(prev => ({
                        ...prev,
                        projects: ignoreKeys(attributes?.projects, [projectName]),
                      }));
                    }}
                    small
                  >
                    Deregister project
                  </Button>
                </SetupSectionRow>
              </AccordionPanel>
            );
          })}
        </Accordion>
      </SetupSection>

      <Spacing mt={UNITS_BETWEEN_SECTIONS} />

      <SetupSection
        title="Features"
      >
        <SetupSectionRow
          description={(
            <Text muted small>
              If this setting is toggled, the feature flags that are set from the root project
              <br />
              will override the feature flags of all sub-projects.
            </Text>
          )}
          title="Override all project features"
          toggleSwitch={{
            checked: attributes?.features?.override,
            onCheck: () => setAttributes(prev => ({
              ...prev,
              features: {
                ...prev?.features,
                override: !attributes?.features?.override,
              },
            })),
          }}
        />
      </SetupSection>

      <Spacing my={UNITS_BETWEEN_SECTIONS}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <div />

          <Button
            beforeIcon={<Save />}
            loading={isLoadingUpdateProject}
            // @ts-ignore
            onClick={() => updateProject({
              project: {
                activate_project: activeProjectName,
                platform_settings: attributes,
                root_project: true,
              },
            })}
            primary
          >
            Save settings
          </Button>
        </FlexContainer>
      </Spacing>
    </Spacing>
  );
}

export default Settings;
