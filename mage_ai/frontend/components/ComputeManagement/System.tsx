import { ThemeContext } from 'styled-components';
import { useContext, useMemo, useState } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel  from '@oracle/components/Accordion/AccordionPanel';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import Spacing from '@oracle/elements/Spacing';
import Headline from '@oracle/elements/Headline';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ObjectAttributesType, SHARED_TEXT_PROPS } from './constants';
import { SparkEnvironmentType, SparkExecutorType } from '@interfaces/SparkType';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

const TAB_ENVIRONMENT = 'Environment';
const TAB_EXECUTORS = 'Executors';

type SystemProps = {
  objectAttributes: ObjectAttributesType;
};

function System({
  objectAttributes,
}: SystemProps) {
  const themeContext = useContext(ThemeContext);
  const [selectedSubheaderTabUUID, setSelectedSubheaderTabUUID] = useState(TAB_ENVIRONMENT);

  const { data: dataExecutors } = api.spark_executors.list();
  const executors: SparkExecutorType[] =
    useMemo(() => dataExecutors?.spark_executors, [dataExecutors]);

  const { data: dataEnvironment } = api.spark_environments.detail('0');
  const environment: SparkEnvironmentType =
    useMemo(() => dataEnvironment?.spark_environment, [dataEnvironment]);

  const environmentMemo = useMemo(() => (
    <>
      <Spacing px={PADDING_UNITS}>
        <Accordion noBoxShadow>
          <AccordionPanel noPaddingContent title="Runtime">
            <Table
              columnFlex={[null, null]}
              columns={[
                {
                  uuid: 'Property',
                },

                {
                  uuid: 'Value',
                },
              ]}
              rows={Object.entries(environment?.runtime || {})?.map((arr) => [
                <Text {...SHARED_TEXT_PROPS} key="property">
                  {arr[0]}
                </Text>,

                <Text {...SHARED_TEXT_PROPS} key="value">
                  {arr[1]}
                </Text>,
              ])}
            />
            <Spacing p={1} />
          </AccordionPanel>

          <AccordionPanel noPaddingContent title="Hadoop properties">
            <Table
              columnFlex={[null, null]}
              columns={[
                {
                  uuid: 'Property',
                },

                {
                  uuid: 'Value',
                },
              ]}
              rows={environment?.hadoop_properties?.map((arr) => [
                <Text {...SHARED_TEXT_PROPS} key="property">
                  {arr[0]}
                </Text>,

                <Text {...SHARED_TEXT_PROPS} key="value">
                  {arr[1]}
                </Text>,
              ])}
            />
            <Spacing p={1} />
          </AccordionPanel>

          <AccordionPanel noPaddingContent title="Metrics properties">
            <Table
              columnFlex={[null, null]}
              columns={[
                {
                  uuid: 'Property',
                },

                {
                  uuid: 'Value',
                },
              ]}
              rows={environment?.metrics_properties?.map((arr) => [
                <Text {...SHARED_TEXT_PROPS} key="property">
                  {arr[0]}
                </Text>,

                <Text {...SHARED_TEXT_PROPS} key="value">
                  {arr[1]}
                </Text>,
              ])}
            />
            <Spacing p={1} />
          </AccordionPanel>

          <AccordionPanel noPaddingContent title="Spark properties">
            <Table
              columnFlex={[1, 4]}
              columns={[
                {
                  uuid: 'Property',
                },

                {
                  uuid: 'Value',
                },
              ]}
              rows={environment?.spark_properties?.map((arr) => [
                <Text {...SHARED_TEXT_PROPS} key="property">
                  {arr[0]}
                </Text>,

                <Text {...SHARED_TEXT_PROPS} key="value">
                  {arr[1]}
                </Text>,
              ])}
            />
            <Spacing p={1} />
          </AccordionPanel>

          <AccordionPanel noPaddingContent title="System properties">
            <Table
              columnFlex={[null, null]}
              columns={[
                {
                  uuid: 'Property',
                },

                {
                  uuid: 'Value',
                },
              ]}
              rows={environment?.system_properties?.map((arr) => [
                <Text {...SHARED_TEXT_PROPS} key="property">
                  {arr[0]}
                </Text>,

                <Text {...SHARED_TEXT_PROPS} key="value">
                  {arr[1]}
                </Text>,
              ])}
            />
            <Spacing p={1} />
          </AccordionPanel>

          <AccordionPanel noPaddingContent title="Classpath entries">
            <Table
              columnFlex={[null, null]}
              columns={[
                {
                  uuid: 'Type',
                },

                {
                  uuid: 'Value',
                },
              ]}
              rows={environment?.classpath_entries?.map((arr) => [
                <Text {...SHARED_TEXT_PROPS} key="type">
                  {arr[1]}
                </Text>,

                <Text {...SHARED_TEXT_PROPS} key="value">
                  {arr[0]}
                </Text>,
              ])}
            />
            <Spacing p={1} />
          </AccordionPanel>
        </Accordion>
      </Spacing>

      {environment?.resource_profiles?.map(({
        executor_resources: executorResources,
        id,
        task_resources: taskResources,
      }) => (
        <div key={id}>
          <Spacing p={PADDING_UNITS}>
            <Headline level={4}>
              Executor resources ID {id}
            </Headline>
          </Spacing>

          <Spacing px={PADDING_UNITS}>
            <Accordion noBoxShadow>
              {Object.entries(executorResources || {}).map(([key, resources]) => (
                <AccordionPanel
                  key={key}
                  noPaddingContent
                  title={capitalizeRemoveUnderscoreLower(key)}
                >
                  <Table
                    columnFlex={[1, 2]}
                    columns={[
                      {
                        uuid: 'Property',
                      },

                      {
                        uuid: 'Value',
                      },
                    ]}
                    rows={Object.entries(resources)?.map((arr) => [
                      <Text {...SHARED_TEXT_PROPS} key="property">
                        {capitalizeRemoveUnderscoreLower(arr[0])}
                      </Text>,

                      <Text {...SHARED_TEXT_PROPS} key="value">
                        {arr[1] || '-'}
                      </Text>,
                    ])}
                  />
                  <Spacing p={1} />
                </AccordionPanel>
              ))}
            </Accordion>
          </Spacing>

          <Spacing p={PADDING_UNITS}>
            <Headline level={4}>
              Task resources ID {id}
            </Headline>
          </Spacing>

          <Spacing px={PADDING_UNITS}>
            <Accordion noBoxShadow>
              {Object.entries(taskResources || {}).map(([key, resources]) => (
                <AccordionPanel
                  key={key}
                  noPaddingContent
                  title={capitalizeRemoveUnderscoreLower(key)}
                >
                  <Table
                    columnFlex={[1, 2]}
                    columns={[
                      {
                        uuid: 'Property',
                      },

                      {
                        uuid: 'Value',
                      },
                    ]}
                    rows={Object.entries(resources)?.map((arr) => [
                      <Text {...SHARED_TEXT_PROPS} key="property">
                        {capitalizeRemoveUnderscoreLower(arr[0])}
                      </Text>,

                      <Text {...SHARED_TEXT_PROPS} key="value">
                        {arr[1] || '-'}
                      </Text>,
                    ])}
                  />
                  <Spacing p={1} />
                </AccordionPanel>
              ))}
            </Accordion>
          </Spacing>
        </div>
      ))}
    </>
  ), [
    environment,
  ]);

  const executorsMemo = useMemo(() => executors?.map((executor) => (
    <div key={executor?.id}>
      <Spacing p={PADDING_UNITS}>
        <Headline level={4}>
          Executor {executor?.id}
        </Headline>
      </Spacing>

      <Spacing px={PADDING_UNITS}>
        <Accordion noBoxShadow>
          <AccordionPanel
            noPaddingContent
            title="Metrics"
          >
            <Table
              columnFlex={[1, 2]}
              columns={[
                {
                  uuid: 'Metric',
                },
                {
                  uuid: 'Value',
                },
              ]}
              rows={[
                'active_tasks',
                'add_time',
                'completed_tasks',
                'disk_used',
                'failed_tasks',
                'host_port',
                'is_active',
                'is_blacklisted',
                'is_excluded',
                'max_memory',
                'max_tasks',
                'memory_used',
                'rdd_blocks',
                'resource_profile_id',
                'total_cores',
                'total_duration',
                'total_gc_time',
                'total_input_bytes',
                'total_shuffle_read',
                'total_shuffle_write',
                'total_tasks',
              ].map((key: string) => {
                const value = executor?.[key];

                return [
                  <Text {...SHARED_TEXT_PROPS} key="property">
                    {capitalizeRemoveUnderscoreLower(key)}
                  </Text>,

                  <Text {...SHARED_TEXT_PROPS} key="value">
                    {typeof value === 'undefined'
                      ? '-'
                      : typeof value === 'boolean'
                        ? String(value)
                        : value
                      }
                  </Text>,
                ];
              })}
            />
            <Spacing p={1} />
          </AccordionPanel>

          <AccordionPanel
            noPaddingContent
            title="Memory metrics"
          >
            <Table
              columnFlex={[1, 2]}
              columns={[
                {
                  uuid: 'Metric',
                },
                {
                  uuid: 'Value',
                },
              ]}
              rows={Object.entries(executor?.memory_metrics || {}).map(([key, value]) => {
                return [
                  <Text {...SHARED_TEXT_PROPS} key="property">
                    {capitalizeRemoveUnderscoreLower(key)}
                  </Text>,

                  <Text {...SHARED_TEXT_PROPS} key="value">
                    {typeof value === 'undefined'
                      ? '-'
                      : typeof value === 'boolean'
                        ? String(value)
                        : value
                      }
                  </Text>,
                ];
              })}
            />
            <Spacing p={1} />
          </AccordionPanel>

          <AccordionPanel
            noPaddingContent
            title="Peak memory metrics"
          >
            <Table
              columnFlex={[1, 2]}
              columns={[
                {
                  uuid: 'Metric',
                },
                {
                  uuid: 'Value',
                },
              ]}
              rows={Object.entries(executor?.peak_memory_metrics || {}).map(([key, value]) => {
                return [
                  <Text {...SHARED_TEXT_PROPS} key="property">
                    {capitalizeRemoveUnderscoreLower(key)}
                  </Text>,

                  <Text {...SHARED_TEXT_PROPS} key="value">
                    {typeof value === 'undefined'
                      ? '-'
                      : typeof value === 'boolean'
                        ? String(value)
                        : value
                      }
                  </Text>,
                ];
              })}
            />
            <Spacing p={1} />
          </AccordionPanel>
        </Accordion>
      </Spacing>
    </div>
  )), [executors]);

  return (
    <>
      <Spacing px={PADDING_UNITS}>
        <ButtonTabs
          noPadding
          onClickTab={({ uuid }) => setSelectedSubheaderTabUUID(uuid)}
          regularSizeText
          selectedTabUUID={selectedSubheaderTabUUID}
          tabs={[
            {
              label: () => TAB_ENVIRONMENT,
              uuid: TAB_ENVIRONMENT,
            },
            {
              label: () => TAB_EXECUTORS,
              uuid: TAB_EXECUTORS,
            },
          ]}
          underlineColor={themeContext?.accent?.blue}
          underlineStyle
        />
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Divider light />
      </Spacing>

      {TAB_ENVIRONMENT === selectedSubheaderTabUUID && environmentMemo}
      {TAB_EXECUTORS === selectedSubheaderTabUUID && executorsMemo}
    </>
  );
}

export default System;
