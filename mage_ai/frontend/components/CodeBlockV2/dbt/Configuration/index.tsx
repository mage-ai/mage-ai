import { useMemo, useState } from 'react';

import BlockType, { BlockLanguageEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ConfigurationOptionType, {
  ConfigurationTypeEnum,
  OptionTypeEnum,
  ResourceTypeEnum,
} from '@interfaces/ConfigurationOptionType';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import {
  CONFIG_KEY_DBT_PROFILES_FILE_PATH,
  CONFIG_KEY_DBT_PROFILE_TARGET,
  CONFIG_KEY_DBT_PROJECT_NAME,
} from '@interfaces/ChartBlockType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

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
// - [ ]  Project: project_path: dbt_project_name
// - [ ]  Profile: ...
// - [ ]  Target: dbt_profile_target
// - [ ]  Sample limit configuration.limit
// - [ ]  File path: configuration.file_path, file_source.path
  const [attributes, setAttributes] = useState(block);

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
  }) => attributes?.configuration?.[CONFIG_KEY_DBT_PROJECT_NAME] === option?.project?.name)?.option, [
    attributes,
    configurationOptions,
  ]);

  const profiles = useMemo(() => project?.profiles || [], [
    project,
  ]);

  const profile = useMemo(() => profiles?.find(({
    full_path: uuid,
  }) => attributes?.configuration?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH]), [
    attributes,
    profiles,
  ])

  const targets = useMemo(() => profile?.targets, [profile]);

  console.log(project)

  return (
    <Spacing p={PADDING_UNITS}>
      <SetupSection
        title="Configuration"
      >
        <SetupSectionRow
          title="Project"
          selectInput={{
            monospace: true,
            onChange: e => setAttributes(prev => ({
              ...prev,
              configuration: {
                ...(prev?.configuration || {}),
                [CONFIG_KEY_DBT_PROJECT_NAME]: e.target.value,
              },
            })),
            options: configurationOptions?.map(({
              option,
            }) => ({
              label: option?.project?.name,
              value: option?.project?.name,
            })),
            placeholder: 'Select project',
            value: attributes?.configuration?.[CONFIG_KEY_DBT_PROJECT_NAME],
          }}
        />

        <SetupSectionRow
          title="Profile"
          selectInput={{
            monospace: true,
            onChange: e => setAttributes(prev => ({
              ...prev,
              configuration: {
                ...(prev?.configuration || {}),
                [CONFIG_KEY_DBT_PROFILES_FILE_PATH]: e.target.value,
              },
            })),
            options: profiles?.map(({
              full_path: uuid,
            }) => ({
              label: uuid,
              value: uuid,
            })),
            placeholder: 'Select profile',
            value: attributes?.configuration?.[CONFIG_KEY_DBT_PROFILES_FILE_PATH],
          }}
        />

        <SetupSectionRow
          title="Target"
          selectInput={{
            monospace: true,
            onChange: e => setAttributes(prev => ({
              ...prev,
              configuration: {
                ...(prev?.configuration || {}),
                [CONFIG_KEY_DBT_PROFILE_TARGET]: e.target.value,
              },
            })),
            options: targets?.map(uuid => ({
              label: uuid,
              value: uuid,
            })),
            placeholder: 'Select target',
            value: attributes?.configuration?.[CONFIG_KEY_DBT_PROFILE_TARGET],
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
