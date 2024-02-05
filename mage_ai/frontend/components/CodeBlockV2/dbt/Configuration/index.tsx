import { useEffect, useMemo, useState } from 'react';

import BlockType, { BlockLanguageEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import ConfigurationOptionType, {
  ConfigurationTypeEnum,
  OptionTypeEnum,
  ResourceTypeEnum,
} from '@interfaces/ConfigurationOptionType';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  CONFIG_KEY_DBT,
  CONFIG_KEY_DBT_COMMAND,
  CONFIG_KEY_DBT_PROFILES_FILE_PATH,
  CONFIG_KEY_DBT_PROFILE_TARGET,
  CONFIG_KEY_DBT_PROJECT_NAME,
  CONFIG_KEY_LIMIT,
} from '@interfaces/ChartBlockType';
import { Info } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { pluralize } from '@utils/string';
import { sortByKey } from '@utils/array';

type ConfigurationProps = {
  block: BlockType;
  pipeline: PipelineType;
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
}

function Configuration({
  block,
  pipeline,
  savePipelineContent,
}: ConfigurationProps) {
  const [attributes, setAttributes] = useState(block);
  const [attributesManuallyEnter, setAttributesManuallyEnter] = useState({});

  const {
    data: dataConfigurationOptions,
  } = api.configuration_options.pipelines.list(pipeline?.uuid,
    {
      configuration_type: ConfigurationTypeEnum.DBT,
      option_type: OptionTypeEnum.PROJECTS,
      resource_type: ResourceTypeEnum.Block,
      resource_uuid: BlockLanguageEnum.SQL === block?.language ? block?.uuid : null,
    }, {
      revalidateOnFocus: false,
    });
  const configurationOptions: ConfigurationOptionType[] =
    useMemo(() => dataConfigurationOptions?.configuration_options, [dataConfigurationOptions]);

  const project = useMemo(() => configurationOptions?.find(({
    option,
  }) => attributes?.configuration?.[CONFIG_KEY_DBT_PROJECT_NAME] === option?.project?.uuid)?.option, [
    attributes,
    configurationOptions,
  ]);
  const projects = useMemo(() => sortByKey(configurationOptions || [], ({ project }) => project?.uuid)?.map(({
    option,
  }) => option?.project), [configurationOptions]);

  const profiles = useMemo(() => project?.profiles || [], [
    project,
  ]);
  const profilesAll = useMemo(() => configurationOptions?.reduce((acc, { option }) => acc.concat(option?.profiles || []), []), [
    projects
  ]);

  const profile = useMemo(() => profiles?.find(({
    full_path: uuid,
  }) => uuid === attributes?.configuration?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH]), [
    attributes,
    profiles,
  ])

  const targets = useMemo(() => profile?.targets || [], [profile]);
  const targetsAll = useMemo(() => configurationOptions?.reduce((acc, { option }) => acc.concat(
    option?.profiles?.reduce((acc2, pro) => acc2.concat(pro.targets), []) || [],
  ), []), [
    projects
  ]);
  const target = useMemo(() => targets?.find(targetName => attributes?.configuration?.[CONFIG_KEY_DBT_PROFILE_TARGET] === targetName), [
    targets,
  ]);

  useEffect(() => {
    const projectNamePath = attributes?.configuration?.[CONFIG_KEY_DBT_PROJECT_NAME];
    if ((project?.project || !projects?.find(({ uuid }) => uuid === projectNamePath)) && projectNamePath) {
      setAttributesManuallyEnter(prev => ({
        ...prev,
        [CONFIG_KEY_DBT_PROJECT_NAME]: projectNamePath !== project?.project?.uuid,
      }));
    }

    const profilePath = attributes?.configuration?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH];
    if ((profilePath && !profile) || (((profile || !profilesAll?.find(pro => pro?.full_path === profilePath)) && profilePath))) {
      setAttributesManuallyEnter(prev => ({
        ...prev,
        [CONFIG_KEY_DBT_PROFILES_FILE_PATH]: (profilePath !== profile?.full_path) || (profilePath && !profile),
      }));
    }

    const targetName = attributes?.configuration?.[CONFIG_KEY_DBT_PROFILE_TARGET];
    if ((targetName && !target) || (((target || !targetsAll?.find(tar => tar === targetName)) && targetName))) {
      setAttributesManuallyEnter(prev => ({
        ...prev,
        [CONFIG_KEY_DBT_PROFILE_TARGET]: targetName !== target || (targetName && !target),
      }));
    }
  }, [
    attributes,
    profile,
    profilesAll,
    project,
    projects,
    target,
    targetsAll,
  ]);

  const inputProject = useMemo(() => {
    let key = 'selectInput';
    let opts = {
      monospace: true,
      onChange: e => setAttributes(prev => ({
        ...prev,
        configuration: {
          ...(prev?.configuration || {}),
          [CONFIG_KEY_DBT_PROJECT_NAME]: e.target.value,
        },
      })),
      options: null,
      placeholder: null,
      value: attributes?.configuration?.[CONFIG_KEY_DBT_PROJECT_NAME],
    };

    if (attributesManuallyEnter?.[CONFIG_KEY_DBT_PROJECT_NAME]) {
      key = 'textInput';
      opts = {
        ...opts,
        placeholder: 'relative_path/from/root_project',
      };
    } else {
      opts = {
        ...opts,
        // @ts-ignore
        options: [{ label: '', value: '' }].concat(projects?.map(({ uuid }) => ({
          label: uuid,
          value: uuid,
        }))),
        placeholder: 'Select project',
      };
    }

    return {
      [key]: opts,
    }
  }, [
    attributes,
    attributesManuallyEnter,
    configurationOptions,
    projects,
  ]);

  const inputProfile = useMemo(() => {
    let key = 'selectInput';
    let opts = {
      monospace: true,
      onChange: e => setAttributes(prev => ({
        ...prev,
        configuration: {
          ...(prev?.configuration || {}),
          [CONFIG_KEY_DBT_PROFILES_FILE_PATH]: e.target.value,
        },
      })),
      options: null,
      placeholder: null,
      value: attributes?.configuration?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH],
    };

    if (attributesManuallyEnter?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH]) {
      key = 'textInput';
      opts = {
        ...opts,
        placeholder: 'relative_path/from/root_project/profiles.yml',
      };
    } else {
      opts = {
        ...opts,
        // @ts-ignore
        options: [{ label: '', value: '' }].concat(profiles?.map(({
          full_path: uuid,
          targets,
        }) => ({
          label: `${uuid} (${pluralize('target', targets?.length || 0)})`,
          value: uuid,
        }))),
        placeholder: 'Select profile',
      };
    }

    return {
      [key]: opts,
    }
  }, [
    attributes,
    attributesManuallyEnter,
    configurationOptions,
    profiles,
  ]);

  const inputTarget = useMemo(() => {
    let key = 'selectInput';
    let opts = {
      monospace: true,
      onChange: e => setAttributes(prev => ({
        ...prev,
        configuration: {
          ...(prev?.configuration || {}),
          [CONFIG_KEY_DBT_PROFILE_TARGET]: e.target.value,
        },
      })),
      options: null,
      placeholder: null,
      value: attributes?.configuration?.[CONFIG_KEY_DBT_PROFILE_TARGET],
    };

    if (attributesManuallyEnter?.[CONFIG_KEY_DBT_PROFILE_TARGET]) {
      key = 'textInput';
      opts = {
        ...opts,
        placeholder: 'e.g. dev',
      };
    } else {
      opts = {
        ...opts,
        // @ts-ignore
        options: [{ label: '', value: '' }].concat(targets?.map(uuid => ({
          label: uuid,
          value: uuid,
        }))),
        placeholder: 'Select target',
      };
    }

    return {
      [key]: opts,
    }
  }, [
    attributes,
    attributesManuallyEnter,
    configurationOptions,
    targets,
  ]);

  return (
    <Spacing p={PADDING_UNITS}>
      <SetupSection
        title="Configuration"
      >
        <SetupSectionRow
          title="Project"
          invalid={!attributes?.configuration?.[CONFIG_KEY_DBT_PROJECT_NAME]}
          description={(
            <Spacing mt={1}>
              <FlexContainer alignItems="center">
                <Checkbox
                  checked={!!attributesManuallyEnter?.[CONFIG_KEY_DBT_PROJECT_NAME]}
                  onClick={() => {
                    setAttributesManuallyEnter(prev => ({
                      ...prev,
                      [CONFIG_KEY_DBT_PROJECT_NAME]: !attributesManuallyEnter?.[CONFIG_KEY_DBT_PROJECT_NAME],
                    }));
                  }}
                />

                <Spacing mr={1} />

                <Text muted inline small>
                  Manually enter the full path from the root directory of the current project,
                  to the dbt project directory that contains the <Text muted inline monospace small>
                    dbt_project.yml
                  </Text> file.
                  Interpolate environment variables, runtime variables, etc.
                  using the following syntax:
                  <Text muted inline monospace small>
                    {'{{ env_var(\'NAME\') }}'}
                  </Text> or <Text muted inline monospace small>
                    {'{{ variables(\'NAME\') }}'}
                  </Text>
                </Text>
              </FlexContainer>
            </Spacing>
          )}
          {...inputProject}
        />

        <SetupSectionRow
          title="Profile"
          invalid={!attributes?.configuration?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH]}
          description={(
            <Spacing mt={1}>
              <FlexContainer alignItems="center">
                <Checkbox
                  checked={!!attributesManuallyEnter?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH]}
                  onClick={() => {
                    setAttributesManuallyEnter(prev => ({
                      ...prev,
                      [CONFIG_KEY_DBT_PROFILES_FILE_PATH]: !attributesManuallyEnter?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH],
                    }));
                  }}
                />

                <Spacing mr={1} />

                <Text muted inline small>
                  Manually enter the full path with the filename <Text muted inline monospace small>
                    profiles.yml
                  </Text>
                  from the root directory of the current project,
                  to the dbt project directory that contains the <Text muted inline monospace small>
                    profiles.yml
                  </Text> file.
                  Interpolate environment variables, runtime variables, etc.
                  using the following syntax:
                  <Text muted inline monospace small>
                    {'{{ env_var(\'NAME\') }}'}
                  </Text> or <Text muted inline monospace small>
                    {'{{ variables(\'NAME\') }}'}
                  </Text>
                </Text>
              </FlexContainer>
            </Spacing>
          )}
          {...inputProfile}
        />

        <SetupSectionRow
          title="Target"
          invalid={!attributes?.configuration?.[CONFIG_KEY_DBT_PROFILE_TARGET]}
          description={(
            <Spacing mt={1}>
              <FlexContainer alignItems="center">
                <Checkbox
                  checked={!!attributesManuallyEnter?.[CONFIG_KEY_DBT_PROFILE_TARGET]}
                  onClick={() => {
                    setAttributesManuallyEnter(prev => ({
                      ...prev,
                      [CONFIG_KEY_DBT_PROFILE_TARGET]: !attributesManuallyEnter?.[CONFIG_KEY_DBT_PROFILE_TARGET],
                    }));
                  }}
                />

                <Spacing mr={1} />

                <Text muted inline small>
                  Manually enter the target name from the <Text muted inline monospace small>
                    dbt_project.yml
                  </Text> file.
                  Interpolate environment variables, runtime variables, etc.
                  using the following syntax:
                  <Text muted inline monospace small>
                    {'{{ env_var(\'NAME\') }}'}
                  </Text> or <Text muted inline monospace small>
                    {'{{ variables(\'NAME\') }}'}
                  </Text>
                </Text>
              </FlexContainer>
            </Spacing>
          )}
          {...inputTarget}
        />

        <SetupSectionRow
          title="Preview query result limit"
          description="Limit the number of rows that are fetched when compiling and previewing."
          textInput={{
            fullWidth: true,
            monospace: true,
            onChange: e => setAttributes(prev => ({
              ...prev,
              configuration: {
                ...(prev?.configuration || {}),
                [CONFIG_KEY_LIMIT]: e.target.value,
              },
            })),
            type: 'number',
            placeholder: 'e.g. 1000',
            value: attributes?.configuration?.[CONFIG_KEY_LIMIT],
          }}
        />
      </SetupSection>

      <Spacing mt={PADDING_UNITS}>
        <FlexContainer justifyContent="flex-end">
          <Button
            onClick={() => {
              savePipelineContent({
                block: {
                  configuration: attributes?.configuration,
                  uuid: block?.uuid,
                },
              });
            }}
            primary
          >
            Save configuration
          </Button>
        </FlexContainer>
      </Spacing>
    </Spacing>
  );
}

export default Configuration;
