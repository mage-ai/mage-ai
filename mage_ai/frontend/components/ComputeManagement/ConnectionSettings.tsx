import { useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Chip from '@oracle/components/Chip';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import {
  Add,
  Edit,
  Save,
  Trash,
} from '@oracle/icons';
import { ContainerStyle, ICON_SIZE } from '@components/shared/index.style';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { SparkConfigType } from '@interfaces/ProjectType';
import { pauseEvent } from '@utils/events';
import { randomSimpleHashGenerator } from '@utils/string';
import { removeAtIndex } from '@utils/array';

type ConnectionSettingsProps = {
  attributesTouched: {
    [key: string]: any;
  }
  isLoading?: boolean;
  mutateObject: () => void;
  objectAttributes: SparkConfigType;
  onCancel?: () => void;
  setObjectAttributes: (objectAttributes: SparkConfigType) => void;
}

function ConnectionSettings({
  attributesTouched,
  isLoading,
  mutateObject,
  objectAttributes,
  onCancel,
  setObjectAttributes,
}: ConnectionSettingsProps) {
  const refNewJarFileUUID = useRef(null);
  const refNewEnvironmentVariableUUID = useRef(null);

  const [isAddingNewJarFile, setIsAddingNewJarFile] = useState(false);
  const [newJarFile, setNewJarFile] = useState<string>(null);
  const jarFiles = useMemo(() => objectAttributes?.spark_jars, [objectAttributes]);
  const hasJarFiles = useMemo(() => jarFiles?.length >= 1, [jarFiles]);
  const jarFileExists = useMemo(() => (jarFiles || []).includes(newJarFile), [
    jarFiles,
    newJarFile,
  ]);

  const [isAddingNewEnvironmentVariable, setIsAddingNewEnvironmentVariable] = useState(false);
  const [newEnvironmentVariable, setNewEnvironmentVariable] = useState<string>(null);
  const environmentVariables = useMemo(() => objectAttributes?.executor_env, [objectAttributes]);
  const hasEnvironmentVariables =
    useMemo(() => Object.keys(environmentVariables || {})?.length >= 1, [environmentVariables]);
  const environmentVariableExists =
    useMemo(() => newEnvironmentVariable in (environmentVariables || {}), [
      environmentVariables,
      newEnvironmentVariable,
    ]);

  const addEnvironmentVariableButton = useMemo(() => (
    <FlexContainer alignItems="center">
      {!isAddingNewEnvironmentVariable && (
        <Button
          beforeIcon={<Add />}
          compact
          onClick={(e) => {
            pauseEvent(e);
            setIsAddingNewEnvironmentVariable(true);
            setTimeout(() => refNewEnvironmentVariableUUID?.current?.focus(), 1);
          }}
          primary={!hasEnvironmentVariables}
          secondary={hasEnvironmentVariables}
          small
        >
          Add environment variable
        </Button>
      )}

      {isAddingNewEnvironmentVariable && (
        <>
          {environmentVariableExists && (
            <>
              <Text danger small>
                Environment variable exists
              </Text>

              <Spacing mr={1} />
            </>
          )}

          <TextInput
            compact
            meta={{
              touched: !!environmentVariableExists,
              error: '',
            }}
            monospace
            onClick={e => pauseEvent(e)}
            paddingVertical={(UNIT / 2) - 2}
            onChange={(e) => {
              pauseEvent(e);
              setNewEnvironmentVariable(e.target.value);
            }}
            ref={refNewEnvironmentVariableUUID}
            small
            value={newEnvironmentVariable || ''}
          />

          <Spacing mr={1} />

          <Button
            disabled={environmentVariableExists}
            compact
            onClick={(e) => {
              pauseEvent(e);

              if (!environmentVariableExists) {
                setObjectAttributes({
                  executor_env: {
                    ...environmentVariables,
                    [newEnvironmentVariable]: '',
                  },
                });

                setIsAddingNewEnvironmentVariable(false);
                setNewEnvironmentVariable(null);
              }
            }}
            primary
            small
          >
            Create environment variable
          </Button>

          <Spacing mr={1} />

          <Button
            compact
            onClick={(e) => {
              pauseEvent(e);

              setIsAddingNewEnvironmentVariable(false);
              setNewEnvironmentVariable(null);
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
    environmentVariableExists,
    environmentVariables,
    hasEnvironmentVariables,
    isAddingNewEnvironmentVariable,
    newEnvironmentVariable,
    refNewEnvironmentVariableUUID,
    setIsAddingNewEnvironmentVariable,
    setNewEnvironmentVariable,
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
          primary={!hasJarFiles}
          secondary={hasJarFiles}
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
                setObjectAttributes({
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

  const environmentVariablesMemo = useMemo(() => Object.entries(environmentVariables || {}).map(([
    key,
    value,
  ]) => (
    <div key={key}>
      <Divider light />

      <Spacing p={PADDING_UNITS}>
        <FlexContainer alignItems="center">
          <Button
            iconOnly
            noBackground
            noBorder
            noPadding
            onClick={() => {
              const updated = { ...environmentVariables };
              delete updated?.[key];
              setObjectAttributes({ executor_env: updated });
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
            {key}
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
              onChange={e => setObjectAttributes({
                executor_env: {
                  ...environmentVariables,
                  [key]: e.target.value,
                },
              })}
              paddingHorizontal={0}
              paddingVertical={0}
              placeholder="e.g. /home/path"
              value={value || ''}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
    </div>
  )), [
    environmentVariables,
    setObjectAttributes,
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
              setObjectAttributes({
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
                setObjectAttributes({
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
              danger={'app_name' in attributesTouched && !objectAttributes?.app_name}
              default
              large
            >
              Application name {'app_name' in attributesTouched && !objectAttributes?.app_name && (
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
                onChange={e => setObjectAttributes({
                  app_name: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. Sparkmage"
                value={objectAttributes?.app_name || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="flex-start">
            <FlexContainer flexDirection="column">
              <Text
                danger={'spark_master' in attributesTouched && !objectAttributes?.spark_master}
                default
                large
              >
                Master URL {'spark_master' in attributesTouched && !objectAttributes?.spark_master && (
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
                onChange={e => setObjectAttributes({
                  spark_master: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. local, yarn, spark://host:port"
                value={objectAttributes?.spark_master || ''}
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
                onChange={e => setObjectAttributes({
                  spark_home: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. /usr/lib/spark"
                value={objectAttributes?.spark_home || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

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
                checked={objectAttributes?.use_custom_session}
                compact
                onCheck={(valFunc: (val: boolean) => boolean) => setObjectAttributes({
                  use_custom_session: valFunc(objectAttributes?.use_custom_session),
                })}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        {objectAttributes?.use_custom_session && (
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
                    onChange={e => setObjectAttributes({
                      custom_session_var_name: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    value={objectAttributes?.custom_session_var_name || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>
          </>
        )}
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
          >
            <Headline level={4}>
              Executor environment variables
            </Headline>

            <Spacing mr={PADDING_UNITS} />

            {hasEnvironmentVariables && (
              <FlexContainer alignItems="center">
                {addEnvironmentVariableButton}
              </FlexContainer>
            )}
          </FlexContainer>
        </Spacing>

        {!hasEnvironmentVariables && (
          <>
            <Divider light />
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default>
                  There are currently no executor environment variables.
                </Text>
              </Spacing>

              <FlexContainer alignItems="center">
                {addEnvironmentVariableButton}
              </FlexContainer>
            </Spacing>
          </>
        )}

        {hasEnvironmentVariables && environmentVariablesMemo}
      </Panel>

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
