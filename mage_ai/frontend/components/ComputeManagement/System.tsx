import { useMemo } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel  from '@oracle/components/Accordion/AccordionPanel';
import Divider from '@oracle/elements/Divider';
import Spacing from '@oracle/elements/Spacing';
import Headline from '@oracle/elements/Headline';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ObjectAttributesType } from './constants';
import { SparkEnvironmentType, SparkExecutorType } from '@interfaces/SparkType';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

type SystemProps = {
  objectAttributes: ObjectAttributesType;
};

function System({
  objectAttributes,
}: SystemProps) {
  const { data: dataExecutors } = api.spark_executors.list();
  const executors: SparkExecutorType[] =
    useMemo(() => dataExecutors?.spark_executors, [dataExecutors]);

  const { data: dataEnvironment } = api.spark_environments.detail('0');
  const environment: SparkEnvironmentType =
    useMemo(() => dataEnvironment?.spark_environment, [dataEnvironment]);

  const sharedTextProps: {
    default: boolean;
    monospace: boolean;
    preWrap: boolean;
    small: boolean;
  } = useMemo(() => ({
    default: true,
    monospace: true,
    preWrap: true,
    small: true,
  }), []);

  console.log(environment)
  console.log(executors)

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <Headline>
          Environment
        </Headline>
      </Spacing>

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
                <Text {...sharedTextProps} key="property">
                  {arr[0]}
                </Text>,

                <Text {...sharedTextProps} key="value">
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
                <Text {...sharedTextProps} key="property">
                  {arr[0]}
                </Text>,

                <Text {...sharedTextProps} key="value">
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
                <Text {...sharedTextProps} key="property">
                  {arr[0]}
                </Text>,

                <Text {...sharedTextProps} key="value">
                  {arr[1]}
                </Text>,
              ])}
            />
            <Spacing p={1} />
          </AccordionPanel>

          <AccordionPanel noPaddingContent title="Spark properties">
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
              rows={environment?.spark_properties?.map((arr) => [
                <Text {...sharedTextProps} key="property">
                  {arr[0]}
                </Text>,

                <Text {...sharedTextProps} key="value">
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
                <Text {...sharedTextProps} key="property">
                  {arr[0]}
                </Text>,

                <Text {...sharedTextProps} key="value">
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
                <Text {...sharedTextProps} key="type">
                  {arr[1]}
                </Text>,

                <Text {...sharedTextProps} key="value">
                  {arr[0]}
                </Text>,
              ])}
            />
            <Spacing p={1} />
          </AccordionPanel>
        </Accordion>
      </Spacing>

      <Spacing mb={PADDING_UNITS} />

      {environment?.resource_profiles?.map(({
        executor_resources: executorResources,
        id,
        task_resources: taskResources,
      }) => (
        <div key={id}>
          <Spacing p={PADDING_UNITS}>
            <Headline>
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
                      <Text {...sharedTextProps} key="property">
                        {capitalizeRemoveUnderscoreLower(arr[0])}
                      </Text>,

                      <Text {...sharedTextProps} key="value">
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
            <Headline>
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
                      <Text {...sharedTextProps} key="property">
                        {capitalizeRemoveUnderscoreLower(arr[0])}
                      </Text>,

                      <Text {...sharedTextProps} key="value">
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
  );
}

export default System;
