import { renderToString } from 'react-dom/server';
import { useCallback, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Chip from '@oracle/components/Chip';
import ComputeServiceType from '@interfaces/ComputeServiceType';
import Divider from '@oracle/elements/Divider';
import ErrorMessage from './ErrorMessage';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyValueConfigurationSection from './shared/KeyValueConfigurationSection';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
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

type ConnectionSettingsProps = {
  attributesTouched: {
    [key: string]: any;
  }
  computeService?: ComputeServiceType;
  isLoading?: boolean;
  mutateObject: (data?: ObjectAttributesType) => void;
  objectAttributes: ObjectAttributesType;
  onCancel?: () => void;
  selectedComputeService?: ComputeServiceUUIDEnum;
  setObjectAttributes: (objectAttributes: ObjectAttributesType) => void;
}

function ConnectionSettings({
  attributesTouched,
  computeService,
  isLoading,
  mutateObject,
  objectAttributes,
  onCancel,
  selectedComputeService,
  setObjectAttributes,
}: ConnectionSettingsProps) {
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

  const refNewJarFileUUID = useRef(null);
  const refNewEnvironmentVariableUUID = useRef(null);

  const [isAddingNewJarFile, setIsAddingNewJarFile] = useState(false);
  const [newJarFile, setNewJarFile] = useState<string>(null);
  const jarFiles = useMemo(() => objectAttributesSparkConfig?.spark_jars || [], [
    objectAttributesSparkConfig,
  ]);
  const hasJarFiles = useMemo(() => jarFiles?.length >= 1, [jarFiles]);
  const jarFileExists = useMemo(() => (jarFiles || []).includes(newJarFile), [
    jarFiles,
    newJarFile,
  ]);

  const addJarFileButton = useMemo(() => (
    <FlexContainer alignItems="center">
      {!isAddingNewJarFile && (
        <Button
          beforeIcon={<Add />}
          compact
          onClick={(e) => {
            pauseEvent(e);
            setIsAddingNewJarFile(true);
            setTimeout(() => refNewJarFileUUID?.current?.focus(), 1);
          }}
          secondary={!hasJarFiles}
          small
        >
          Add JAR file
        </Button>
      )}

      {isAddingNewJarFile && (
        <>
          {jarFileExists && (
            <>
              <Text danger small>
                JAR file exists
              </Text>

              <Spacing mr={1} />
            </>
          )}

          <TextInput
            autoComplete="off"
            compact
            meta={{
              touched: !!jarFileExists,
              error: '',
            }}
            monospace
            onClick={e => pauseEvent(e)}
            paddingVertical={(UNIT / 2) - 2}
            onChange={(e) => {
              pauseEvent(e);
              setNewJarFile(e.target.value);
            }}
            ref={refNewJarFileUUID}
            small
            value={newJarFile || ''}
          />

          <Spacing mr={1} />

          <Button
            disabled={jarFileExists}
            compact
            onClick={(e) => {
              pauseEvent(e);

              if (!jarFileExists) {
                setObjectAttributesSparkConfig({
                  spark_jars: jarFiles.concat(newJarFile),
                });

                setIsAddingNewJarFile(false);
                setNewJarFile(null);
              }
            }}
            primary
            small
          >
            Add JAR file
          </Button>

          <Spacing mr={1} />

          <Button
            compact
            onClick={(e) => {
              pauseEvent(e);

              setIsAddingNewJarFile(false);
              setNewJarFile(null);
            }}
            secondary
            small
          >
            Cancel
          </Button>
        </>
      )}
    </FlexContainer>
  ), [
    jarFileExists,
    jarFiles,
    hasJarFiles,
    isAddingNewJarFile,
    newJarFile,
    refNewJarFileUUID,
    setIsAddingNewJarFile,
    setNewJarFile,
  ]);

  const jarFilesMemo = useMemo(() => jarFiles?.map((value: string, idx: number) => (
    <div key={value}>
      <Divider light />

      <Spacing p={PADDING_UNITS}>
        <FlexContainer alignItems="center">
          <Button
            iconOnly
            noBackground
            noBorder
            noPadding
            onClick={() => {
              const arr = [...jarFiles];
              setObjectAttributesSparkConfig({
                spark_jars: removeAtIndex(arr, idx),
              });
            }}
          >
            <Trash default size={ICON_SIZE} />
          </Button>

          <Spacing mr={PADDING_UNITS} />

          <Text
            default
            large
            monospace
          >
            File {idx + 1}
          </Text>

          <Spacing mr={PADDING_UNITS} />

          <Flex flex={1}>
            <TextInput
              afterIcon={<Edit />}
              afterIconClick={(_, inputRef) => {
                inputRef?.current?.focus();
              }}
              afterIconSize={ICON_SIZE}
              alignRight
              fullWidth
              large
              monospace
              noBackground
              noBorder
              onChange={(e) => {
                const arr = [...jarFiles];
                arr[idx] = e.target.value;
                setObjectAttributesSparkConfig({
                  spark_jars: arr,
                });
              }}
              paddingHorizontal={0}
              paddingVertical={0}
              placeholder="e.g. /home/path/example1.jar"
              value={value || ''}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
    </div>
  )), [
    jarFiles,
    setObjectAttributesSparkConfig,
  ]);

  const awsEMRSetupMemo = useMemo(() => {
    const remoteVariablesDirKey = 'remote_variables_dir';
    const steps = computeService?.setup_steps;
    const remoteVariablesDirStep = steps?.find(({ uuid }) => uuid === remoteVariablesDirKey);

    return (
      <>
        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="flex-start">
            <FlexContainer flexDirection="column">
              <Text
                danger={!objectAttributes?.[remoteVariablesDirKey]
                  || !!remoteVariablesDirStep?.error
                }
                default
                large
              >
                Remote variables directory {!objectAttributes?.[remoteVariablesDirKey] && (
                  <Text danger inline large>
                    is required
                  </Text>
                )}
              </Text>

              <Text muted small>
                This S3 bucket will be used by Spark.
              </Text>
            </FlexContainer>

            <Spacing mr={PADDING_UNITS} />

            <Flex flex={1} flexDirection="column">
              <TextInput
                afterIcon={<Edit />}
                afterIconClick={(_, inputRef) => {
                  inputRef?.current?.focus();
                }}
                afterIconSize={ICON_SIZE}
                alignRight
                large
                monospace
                noBackground
                noBorder
                fullWidth
                onChange={e => setObjectAttributes({
                  remote_variables_dir: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. s3://magically-powerful-bucket"
                value={objectAttributes?.remote_variables_dir || ''}
              />

              {remoteVariablesDirStep?.error && (
                <FlexContainer justifyContent="flex-end">
                  <Spacing mt={1}>
                    <ErrorMessage error={remoteVariablesDirStep?.error} />
                  </Spacing>
                </FlexContainer>
              )}
            </Flex>
          </FlexContainer>
        </Spacing>
      </>
    );
  }, [
    computeService,
    objectAttributes,
    setObjectAttributes,
  ]);

  return (
    <ContainerStyle>
      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <Headline level={4}>
            Setup
          </Headline>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text
              danger={'app_name' in attributesTouched && !objectAttributesSparkConfig?.app_name}
              default
              large
            >
              Application name {'app_name' in attributesTouched && !objectAttributesSparkConfig?.app_name && (
                <Text danger inline large>
                  is required
                </Text>
              )}
            </Text>

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
                onChange={e => setObjectAttributesSparkConfig({
                  app_name: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. Sparkmage"
                value={objectAttributesSparkConfig?.app_name || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="flex-start">
            <FlexContainer flexDirection="column">
              <Text
                danger={'spark_master' in attributesTouched && !objectAttributesSparkConfig?.spark_master}
                default
                large
              >
                Master URL {'spark_master' in attributesTouched && !objectAttributesSparkConfig?.spark_master && (
                  <Text danger inline large>
                    is required
                  </Text>
                )}
              </Text>

              <Text muted small>
                The URL for connecting to the master.
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
                large
                noBackground
                noBorder
                fullWidth
                onChange={e => setObjectAttributesSparkConfig({
                  spark_master: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. local, yarn, spark://host:port"
                value={objectAttributesSparkConfig?.spark_master || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="flex-start">
            <FlexContainer flexDirection="column">
              <Text
                default
                large
              >
                Spark home directory
              </Text>

              <Text muted small>
                Path where Spark is installed on worker nodes.
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
                large
                monospace
                noBackground
                noBorder
                fullWidth
                onChange={e => setObjectAttributesSparkConfig({
                  spark_home: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. /usr/lib/spark"
                value={objectAttributesSparkConfig?.spark_home || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        {ComputeServiceUUIDEnum.AWS_EMR === selectedComputeService && awsEMRSetupMemo}
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      {computeService?.connection_credentials && (
        <>
          <Panel noPadding>
            <Spacing p={PADDING_UNITS}>
              <Headline level={4}>
                Credentials
              </Headline>
            </Spacing>

            {computeService?.connection_credentials?.map(({
              description,
              error,
              name,
              required,
              uuid,
              valid,
              value,
            }) => {
              return (
                <div key={uuid}>
                  <Divider light />

                  <Spacing p={PADDING_UNITS}>
                    <FlexContainer alignItems="center">
                      <FlexContainer flexDirection="column">
                        <Text
                          danger={!valid}
                          default
                          large
                          monospace={!name}
                        >
                          {name || uuid} {!valid && (
                            <Text danger inline large>
                              is invalid
                            </Text>
                          )}
                        </Text>

                        {description && (
                          <Text muted small>
                            {description}
                          </Text>
                        )}
                      </FlexContainer>

                      <Spacing mr={PADDING_UNITS} />

                      <Flex flex={1} justifyContent="flex-end">
                        {!valid && (
                          <>
                            {!error && required && (
                              <Text muted large>
                                Required but missing
                              </Text>
                            )}
                            {!error && !required && (
                              <Text muted large>
                                Invalid
                              </Text>
                            )}
                            {error && <ErrorMessage error={error} large />}
                          </>
                        )}

                        {valid && value && (
                          <Text default large>
                            {value}
                          </Text>
                        )}
                      </Flex>
                    </FlexContainer>
                  </Spacing>
                </div>
              );
            })}
          </Panel>

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />
        </>
      )}

      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <Headline level={4}>
            Customizations
          </Headline>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="flex-start">
            <FlexContainer flexDirection="column">
              <Text
                default
                large
              >
                Use custom session
              </Text>

              <Text muted small>
                Whether to create custom SparkSession via
                <br />
                code and set it in <Text
                  inline
                  monospace
                  muted
                  small
                >
                  kwargs['context']
                </Text>.
              </Text>
            </FlexContainer>

            <Spacing mr={PADDING_UNITS} />

            <Flex flex={1} justifyContent="flex-end">
              <ToggleSwitch
                checked={objectAttributesSparkConfig?.use_custom_session}
                compact
                onCheck={(valFunc: (val: boolean) => boolean) => setObjectAttributesSparkConfig({
                  use_custom_session: valFunc(objectAttributesSparkConfig?.use_custom_session),
                })}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        {objectAttributesSparkConfig?.use_custom_session && (
          <>
            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="flex-start">
                <FlexContainer flexDirection="column">
                  <Text
                    default
                    large
                  >
                    Custom session variable
                  </Text>

                  <Text muted small>
                    The variable name to set in <Text
                      inline
                      monospace
                      muted
                      small
                    >
                      kwargs['context']
                    </Text>,
                    <br />
                    e.g. If variable name is <Text
                      inline
                      monospace
                      muted
                      small
                    >
                      spark
                    </Text> then the Spark session
                    <br />
                    is accessed using <Text
                      inline
                      monospace
                      muted
                      small
                    >
                      kwargs['context']['spark']
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
                    large
                    monospace
                    noBackground
                    noBorder
                    fullWidth
                    onChange={e => setObjectAttributesSparkConfig({
                      custom_session_var_name: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="e.g. spark"
                    value={objectAttributesSparkConfig?.custom_session_var_name || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>
          </>
        )}

        {ComputeServiceUUIDEnum.AWS_EMR === selectedComputeService && (
          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <FlexContainer flexDirection="column">
                <Text
                  default
                  large
                >
                  Bootstrap script path
                </Text>

                <Text muted small>
                  Use a custom script to bootstrap the EMR cluster.
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
                    bootstrap_script_path: e.target.value,
                  })}
                  paddingHorizontal={0}
                  paddingVertical={0}
                  placeholder="e.g. /path/to/emr_bootstrap.sh"
                  value={objectAttributesEMRConfig?.bootstrap_script_path || ''}
                />
              </Flex>
            </FlexContainer>
          </Spacing>
        )}
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      <KeyValueConfigurationSection
        addButtonText="Add environment variable"
        addTextInputPlaceholder="e.g. PYTHONPATH"
        alreadyExistsMessage="Environment variable exists"
        configurationValuePlaceholder="e.g. /home/path"
        configurations={objectAttributesSparkConfig?.executor_env}
        createButtonText="Create environment variable"
        description={(
          <Text muted>
            Environment variables for the executor.
          </Text>
        )}
        emptyState="There are currently no executor environment variables."
        setConfigurations={data => setObjectAttributesSparkConfig({
          executor_env: data,
        })}
        title="Environment variables"
      />

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer
            alignItems="flex-start"
            justifyContent="space-between"
          >
            <Flex flex={1} flexDirection="column">
              <Headline level={4}>
                JAR files
              </Headline>

              <Spacing mt={1}>
                <Text muted>
                  These files will be to be uploaded to the cluster
                  and added to the <Text
                    inline
                    monospace
                    muted
                  >
                    classpath
                  </Text>.
                </Text>
              </Spacing>
            </Flex>

            <Spacing mr={PADDING_UNITS} />

            {hasJarFiles && (
              <FlexContainer alignItems="center">
                {addJarFileButton}
              </FlexContainer>
            )}
          </FlexContainer>
        </Spacing>

        {!hasJarFiles && (
          <>
            <Divider light />
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default>
                  There are currently no JAR files.
                </Text>
              </Spacing>

              <FlexContainer alignItems="center">
                {addJarFileButton}
              </FlexContainer>
            </Spacing>
          </>
        )}

        {hasJarFiles && jarFilesMemo}
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

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

export default ConnectionSettings;
