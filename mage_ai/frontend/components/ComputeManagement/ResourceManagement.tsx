import { useCallback, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyValueConfigurationSection from './shared/KeyValueConfigurationSection';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import {
  Add,
  Edit,
  Save,
  Trash,
} from '@oracle/icons';
import { CardStyle } from './index.style';
import { ComputeServiceUUIDEnum } from '@interfaces/ComputeServiceType';
import { ContainerStyle, ICON_SIZE } from '@components/shared/index.style';
import { ObjectAttributesType } from './constants';
import { EMRConfigType, SparkConfigType } from '@interfaces/ProjectType';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { pauseEvent } from '@utils/events';
import { randomSimpleHashGenerator } from '@utils/string';
import { removeAtIndex } from '@utils/array';

type ResourceManagementProps = {
  attributesTouched: {
    [key: string]: any;
  }
  isLoading?: boolean;
  mutateObject: (data?: ObjectAttributesType) => void;
  objectAttributes: ObjectAttributesType;
  onCancel?: () => void;
  selectedComputeService?: ComputeServiceUUIDEnum;
  setObjectAttributes: (objectAttributes: ObjectAttributesType) => void;
}

function ResourceManagement({
  attributesTouched,
  isLoading,
  mutateObject,
  objectAttributes,
  onCancel,
  selectedComputeService,
  setObjectAttributes,
}: ResourceManagementProps) {
  const setObjectAttributesEMRConfig =
    useCallback((data: EMRConfigType) => setObjectAttributes({
      emr_config: {
        ...objectAttributes?.emr_config,
        ...data,
      },
    }), [
      objectAttributes,
      setObjectAttributes,
    ]);
  const setObjectAttributesSparkConfig =
    useCallback((data: SparkConfigType) => setObjectAttributes({
      spark_config: {
        ...objectAttributes?.spark_config,
        ...data,
      },
    }), [
      objectAttributes,
      setObjectAttributes,
    ]);

  const objectAttributesEMRConfig = useMemo(() => objectAttributes?.emr_config || {}, [
    objectAttributes,
  ]);
  const objectAttributesSparkConfig = useMemo(() => objectAttributes?.spark_config || {}, [
    objectAttributes,
  ]);

  return (
    <ContainerStyle>
      <KeyValueConfigurationSection
        addButtonText="Add Spark configuration"
        addTextInputPlaceholder="e.g. spark.driver.cores"
        alreadyExistsMessage="Spark configuration exists"
        configurationValuePlaceholder="e.g. 4g"
        configurations={objectAttributesSparkConfig?.others}
        createButtonText="Create Spark configuration"
        description={(
          <>
            <Text muted>
              List of key-value pairs to be set in <Text
                inline
                monospace
                muted
              >
                SparkConf
              </Text>, e.g. <Text
                inline
                monospace
                muted
              >
                spark.executor.memory=4g
              </Text>.
            </Text>
            <Text muted>
              For a list of all configurations, see the <Link
                href="https://spark.apache.org/docs/latest/configuration.html"
                inline
                openNewWindow
              >
                Spark configuration documentation
              </Link>.
            </Text>
          </>
        )}
        emptyState="There are currently no executor Spark configurations."
        setConfigurations={data => setObjectAttributesSparkConfig({
          others: data,
        })}
        title="Spark configurations"
      />

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      {ComputeServiceUUIDEnum.AWS_EMR === selectedComputeService && (
        <>
          <Panel noPadding>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
              >
                <Flex flex={1} flexDirection="column">
                  <Headline
                    level={4}
                    warning={!objectAttributesEMRConfig?.ec2_key_name || !objectAttributesEMRConfig?.ec2_key_path}
                  >
                    Spark observability
                  </Headline>

                  {(!objectAttributesEMRConfig?.ec2_key_name || !objectAttributesEMRConfig?.ec2_key_path)
                    && 'ec2_key_name' in (attributesTouched?.emr_config || {})
                    && 'ec2_key_path' in (attributesTouched?.emr_config || {})
                    && (
                    <>
                      <Spacing mt={1}>
                        <Text warning>
                          Without all the fields in this section present and valid,
                          Mage won’t automatically create the SSH tunnel.

                          <br />

                          You must manually create the SSH tunnel in order for Mage to retrieve
                          and display the Spark jobs, statuses, metrics, and system information.
                        </Text>
                      </Spacing>
                    </>
                  )}

                  <Spacing mt={1}>
                    <Text muted>
                      In order to see the Spark jobs, statuses, metrics, and system information,
                      an SSH tunnel to the AWS EMR Master Node must be created.

                      <br />

                      Mage can automatically create the SSH tunnel for you
                      if every field in this section is present and valid.
                    </Text>
                  </Spacing>

                  <Spacing mt={1}>
                    <Text muted>
                    </Text>
                  </Spacing>
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <FlexContainer flexDirection="column">
                  <Text
                    default
                    large
                  >
                    EC2 key name
                  </Text>

                  <Text muted small>
                    SSH tunnel into the EMR cluster using
                    a key pair created from the <Link
                      href="https://console.aws.amazon.com/ec2/home#KeyPairs"
                      inline
                      openNewWindow
                      small
                    >
                      AWS guide
                    </Link>.
                  </Text>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <Flex flex={1}>
                  <TextInput
                    afterIcon={<Edit />}
                    afterIconClick={(_, inputRef) => {
                      inputRef?.current?.focus();
                    }}
                    afterIconSize={ICON_SIZE}
                    alignRight
                    autoComplete="off"
                    large
                    noBackground
                    noBorder
                    fullWidth
                    onChange={e => setObjectAttributesEMRConfig({
                      ec2_key_name: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="e.g. ec2_key_pair_name"
                    value={objectAttributesEMRConfig?.ec2_key_name || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <FlexContainer flexDirection="column">
                  <Text
                    default
                    large
                  >
                    EC2 key path
                  </Text>

                  <Text muted small>
                    The absolute file path to the EC2 public key that was used when
                    creating a cluster.
                  </Text>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <Flex flex={1}>
                  <TextInput
                    afterIcon={<Edit />}
                    afterIconClick={(_, inputRef) => {
                      inputRef?.current?.focus();
                    }}
                    afterIconSize={ICON_SIZE}
                    alignRight
                    autoComplete="off"
                    large
                    monospace
                    noBackground
                    noBorder
                    fullWidth
                    onChange={e => setObjectAttributesEMRConfig({
                      ec2_key_path: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="e.g. ec2_key_pair_name"
                    value={objectAttributesEMRConfig?.ec2_key_path || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>
          </Panel>

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />

          <Panel noPadding>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
              >
                <Flex flex={1} flexDirection="column">
                  <Headline level={4}>
                    EMR instance types
                  </Headline>

                  <Spacing mt={1}>
                    <Text muted>
                      Refer to the <Link
                        href="https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-supported-instance-types.html"
                        openNewWindow
                      >
                        AWS EMR
                      </Link> documentation for all supported EMR instance types.
                    </Text>
                  </Spacing>
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <FlexContainer flexDirection="column">
                  <Text
                    default
                    large
                  >
                    Master instance type
                  </Text>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <Flex flex={1}>
                  <TextInput
                    afterIcon={<Edit />}
                    afterIconClick={(_, inputRef) => {
                      inputRef?.current?.focus();
                    }}
                    afterIconSize={ICON_SIZE}
                    alignRight
                    autoComplete="off"
                    large
                    noBackground
                    noBorder
                    fullWidth
                    onChange={e => setObjectAttributesEMRConfig({
                      master_instance_type: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="e.g. r5.4xlarge"
                    value={objectAttributesEMRConfig?.master_instance_type || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <FlexContainer flexDirection="column">
                  <Text
                    default
                    large
                  >
                    Slave instance type
                  </Text>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <Flex flex={1}>
                  <TextInput
                    afterIcon={<Edit />}
                    afterIconClick={(_, inputRef) => {
                      inputRef?.current?.focus();
                    }}
                    afterIconSize={ICON_SIZE}
                    alignRight
                    autoComplete="off"
                    large
                    noBackground
                    noBorder
                    fullWidth
                    onChange={e => setObjectAttributesEMRConfig({
                      slave_instance_type: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="e.g. r5.2xlarge"
                    value={objectAttributesEMRConfig?.slave_instance_type || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <FlexContainer flexDirection="column">
                  <Text
                    default
                    large
                  >
                    Number of slave instances
                  </Text>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <Flex flex={1}>
                  <TextInput
                    afterIcon={<Edit />}
                    afterIconClick={(_, inputRef) => {
                      inputRef?.current?.focus();
                    }}
                    afterIconSize={ICON_SIZE}
                    alignRight
                    autoComplete="off"
                    large
                    noBackground
                    noBorder
                    fullWidth
                    onChange={(e) => {
                      const reg = /^\d+$/;

                      const val = e.target.value || '';
                      if (val === '' || reg.exec(val)) {
                        setObjectAttributesEMRConfig({
                          slave_instance_count: val,
                        });
                      }
                    }}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="e.g. 2"
                    value={objectAttributesEMRConfig?.slave_instance_count || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>
          </Panel>

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />

          <KeyValueConfigurationSection
            addButtonText="Add Spark configuration"
            addTextInputPlaceholder="e.g. spark.driver.cores"
            alreadyExistsMessage="Spark configuration exists"
            configurationValuePlaceholder="e.g. 4g"
            configurations={objectAttributesEMRConfig?.master_spark_properties}
            createButtonText="Create Spark configuration"
            description={(
              <>
                <Text muted>
                  List of key-value pairs to be set in <Text
                    inline
                    monospace
                    muted
                  >
                    SparkConf
                  </Text> for the master instance.
                </Text>
                <Text muted>
                  For a list of all configurations, see the <Link
                    href="https://spark.apache.org/docs/latest/configuration.html"
                    inline
                    openNewWindow
                  >
                    Spark configuration documentation
                  </Link>.
                </Text>
              </>
            )}
            emptyState="There are currently no Spark configurations for the master instance."
            setConfigurations={data => setObjectAttributesEMRConfig({
              master_spark_properties: data,
            })}
            title="Master Spark configurations"
          />

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />

          <KeyValueConfigurationSection
            addButtonText="Add Spark configuration"
            addTextInputPlaceholder="e.g. spark.driver.cores"
            alreadyExistsMessage="Spark configuration exists"
            configurationValuePlaceholder="e.g. 4g"
            configurations={objectAttributesEMRConfig?.slave_spark_properties}
            createButtonText="Create Spark configuration"
            description={(
              <>
                <Text muted>
                  List of key-value pairs to be set in <Text
                    inline
                    monospace
                    muted
                  >
                    SparkConf
                  </Text> for the slave instance.
                </Text>
                <Text muted>
                  For a list of all configurations, see the <Link
                    href="https://spark.apache.org/docs/latest/configuration.html"
                    inline
                    openNewWindow
                  >
                    Spark configuration documentation
                  </Link>.
                </Text>
              </>
            )}
            emptyState="There are currently no Spark configurations for the slave instance."
            setConfigurations={data => setObjectAttributesEMRConfig({
              slave_spark_properties: data,
            })}
            title="Slave Spark configurations"
          />

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />

          <Panel noPadding>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
              >
                <Flex flex={1} flexDirection="column">
                  <Headline level={4}>
                    Security
                  </Headline>

                  <Spacing mt={1}>
                    <Text muted>
                      Configure security groups for EMR cluster instances.
                    </Text>
                  </Spacing>
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <FlexContainer flexDirection="column">
                  <Text
                    default
                    large
                  >
                    Master security group
                  </Text>

                  <Text muted small>
                    The default managed security group is <Text
                      inline
                      monospace
                      muted
                      small
                    >
                      ElasticMapReduce-master
                    </Text>.
                  </Text>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <Flex flex={1}>
                  <TextInput
                    afterIcon={<Edit />}
                    afterIconClick={(_, inputRef) => {
                      inputRef?.current?.focus();
                    }}
                    afterIconSize={ICON_SIZE}
                    alignRight
                    autoComplete="off"
                    large
                    noBackground
                    noBorder
                    fullWidth
                    onChange={e => setObjectAttributesEMRConfig({
                      master_security_group: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="e.g. sg-xxxxxxxxxxxx"
                    value={objectAttributesEMRConfig?.master_security_group || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <FlexContainer flexDirection="column">
                  <Text
                    default
                    large
                  >
                    Slave security group
                  </Text>

                  <Text muted small>
                    The default managed security group is <Text
                      inline
                      monospace
                      muted
                      small
                    >
                      ElasticMapReduce-slave
                    </Text>.
                  </Text>
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <Flex flex={1}>
                  <TextInput
                    afterIcon={<Edit />}
                    afterIconClick={(_, inputRef) => {
                      inputRef?.current?.focus();
                    }}
                    afterIconSize={ICON_SIZE}
                    alignRight
                    autoComplete="off"
                    large
                    noBackground
                    noBorder
                    fullWidth
                    onChange={e => setObjectAttributesEMRConfig({
                      slave_security_group: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="e.g. sg-yyyyyyyyyyyy"
                    value={objectAttributesEMRConfig?.slave_security_group || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>
          </Panel>

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />
        </>
      )}

      <FlexContainer>
        <Button
          beforeIcon={<Save />}
          disabled={!attributesTouched || !Object.keys(attributesTouched)?.length}
          loading={isLoading}
          onClick={() => mutateObject()}
          primary
        >
          Save changes
        </Button>

        {onCancel && (
          <>
            <Spacing mr={PADDING_UNITS} />

            <Button
              onClick={() => onCancel?.()}
              secondary
            >
              Cancel and go back
            </Button>
          </>
        )}
      </FlexContainer>
    </ContainerStyle>
  );
}

export default ResourceManagement;
