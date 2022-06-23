import React, { useContext } from 'react';
import dynamic from 'next/dynamic';
import styled, { ThemeContext } from 'styled-components';

import Button from '@oracle/elements/Button';
import DatasetDetail, { DatasetDetailSharedProps } from '../Detail';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PanelOld from '@oracle/components/PanelOld';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  MAX_LINES_EXPORT_1,
  MAX_LINES_EXPORT_2,
  MAX_LINES_LAUNCH,
  MAX_LINES_USE,
  MIN_LINES_LAUNCH,
  MIN_LINES_USE,
  READ_ONLY,
} from '@oracle/styles/editor/rules';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { PADDING } from '@oracle/styles/units/spacing';
import { REGULAR_FONT_SIZE, REGULAR_LINE_HEIGHT} from '@oracle/styles/fonts/sizes';

const CodeEditor = dynamic(
  async () => {
    const ace = await import('react-ace');
    require('ace-builds/src-noconflict/mode-python');
    require('ace-builds/src-noconflict/ace');
    return ace;
  },
  {
    ssr: false,
  },
);

const ImageStyle = styled.img`
  margin-top: ${PADDING}px;
  max-width: 900px;
  object-fit: contain;
  width: 100%;
`

function download(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

const SAMPLE_CLEAN_CODE_EXAMPLE_PIPELINE_ID = (id) => `import mage_ai
import pandas as pd


df = pd.read_csv('/datasets/training_data.csv') # Load the data
mage_ai.clean(df, pipeline_uuid=${id})`;

const SAMPLE_CLEAN_CODE_EXAMPLE = `import mage_ai
import pandas as pd


df = pd.read_csv('/datasets/training_data.csv') # Load the data

# The path to the JSON file can be absolute or relative
mage_ai.clean(df, pipeline_path='/path_to_json_file.json')`;

const SAMPLE_LAUNCH_API_KEY_EXAMPLE_1 = (pipeline_id) => `import mage_ai

# Sync your local datasets and pipelines with the cloud database
mage_ai.remote_sync(api_key=<your api key>)`;

const SAMPLE_LAUNCH_API_KEY_EXAMPLE_2 = (pipeline_id) => `import mage_ai
import pandas as pd

# Clean a dataset with a pipeline saved in the cloud
df = pd.read_csv('/datasets/training_data.csv') # Load data
mage_ai.clean(df, remote_pipeline_uuid=${pipeline_id ? pipeline_id : "pipeline id"}, api_key=<your api key>)`;

const SAMPLE_USE_API_KEY_EXAMPLE_1 = (pipeline_id) => `import mage_ai
import pandas as pd

# Sync your local datasets and pipelines with the cloud database
mage_ai.remote_sync()`;

const SAMPLE_USE_API_KEY_EXAMPLE_2 = (pipeline_id) => `import mage_ai
import pandas as pd

# Clean a dataset with a pipeline saved in the cloud
df = pd.read_csv('/datasets/training_data.csv') # Load data
mage_ai.clean(df, remote_pipeline_uuid=${pipeline_id ? pipeline_id : "pipeline id"})`;

function Export({
  featureSet,
  ...props
}: DatasetDetailSharedProps) {
  const themeContext = useContext(ThemeContext);

  const {
    metadata,
    pipeline,
  } = featureSet || {};

  const {
    metadata: pipelineMetadata,
  } = pipeline || {};

  const { data: status } = api.status.list()
  const {
    api_key_provided: apiKeyProvided
  } = status || {};

  return (
    <DatasetDetail
      {...props}
      featureSet={featureSet}
      hideColumnsHeader
    >
      <Spacing mb={5}>
        <Headline level={2}>
          Export data pipeline for <Headline
            bold
            inline
            level={3}
            monospace
          >
            {metadata?.name}
          </Headline>
        </Headline>
      </Spacing>

      <PanelOld
        containedWidth
        fullWidth
      >
        <Headline level={3}>
          Method 1: using the pipeline in the same environment as the tool
        </Headline>

        <Spacing my={3}>
          <Divider />
        </Spacing>

        <Spacing mb={5}>
          <Spacing mb={1}>
            <Headline level={4}>
              Call the <Headline bold inline level={4} monospace>
                clean
              </Headline> method
            </Headline>
          </Spacing>
          <Text>
            Load your data as a Pandas dataframe, then
            invoke the cleaning method by passing in the dataframe variable as the 1st argument
            and referencing the pipeline’s UUID as a keyword argument.
          </Text>

          <Spacing mt={1} />

          <Text>
            The current pipeline UUID is <Text bold inline monospace>
              {pipeline?.id}
            </Text>.
          </Text>

          <Spacing mt={1} />

          <Text>
            The return value of the <Text bold inline monospace>mage_ai.clean</Text> method
            is a Pandas dataframe that has been cleaned using
            all the actions in your data pipeline.
          </Text>

          <Spacing mt={2}>
            <CodeEditor
              maxLines={MAX_LINES_EXPORT_1}
              minLines={MAX_LINES_EXPORT_1}
              mode="python"
              readOnly
              setOptions={READ_ONLY}
              style={{
                backgroundColor: themeContext.monotone.grey100,
                fontFamily: MONO_FONT_FAMILY_REGULAR,
                fontSize: REGULAR_FONT_SIZE,
                lineHeight: `${REGULAR_LINE_HEIGHT}px`,
                overflow: 'auto',
                tabSize: 4,
                width: 'inherit',
              }}
              value={SAMPLE_CLEAN_CODE_EXAMPLE_PIPELINE_ID(pipeline?.id)}
            />
          </Spacing>
        </Spacing>
      </PanelOld>

      <Spacing mb={5} />

      <PanelOld
        containedWidth
        fullWidth
      >
        <Headline level={3}>
          Method 2: local JSON file
        </Headline>

        <Spacing my={3}>
          <Divider />
        </Spacing>

        <Spacing mb={5}>
          <Spacing mb={1}>
            <Headline level={4}>
              Download the pipeline JSON file
            </Headline>
          </Spacing>
          <Text>
            The <Text bold inline monospace>mage_ai</Text> Python library will read
            from a local JSON file that has been created through this tool.

            <Spacing mb={1} />

            <FlexContainer alignItems="center">
              <Button
                onClick={() => {
                  const pipeline = JSON.stringify(featureSet?.pipeline?.actions);
                  download(pipeline, `${metadata?.name}.json`, 'text/plain');
                }}
                primary
              >
                Click here to download
              </Button>&nbsp;
              <Text>
                the file to your local machine.
              </Text>
            </FlexContainer>
          </Text>
        </Spacing>

        <Spacing mb={5}>
          <Spacing mb={1}>
            <Headline level={4}>
              Upload the pipeline JSON file to your runtime environment
            </Headline>
          </Spacing>
          <Text>
            Whichever environment you want to use this data pipeline,
            upload the JSON file you just downloaded to the machine that will be
            invoking your data pipeline.
          </Text>
          <Spacing mb={2} />
          <Text>
            For example, if you want to invoke your data pipeline on a server running in the
            cloud (e.g. AWS, GCP, Azure, etc.), then upload the JSON file to that server
            so that it can be referenced in the next step.
          </Text>
        </Spacing>

        <Spacing mb={5}>
          <Spacing mb={1}>
            <Headline level={4}>
              Call the <Headline bold inline level={4} monospace>
                clean
              </Headline> method
            </Headline>
          </Spacing>
          <Text>
            Load your data as a Pandas dataframe, then
            invoke the cleaning method by passing in the dataframe variable as the 1st argument
            and referencing the JSON file path as a keyword argument.
          </Text>

          <Spacing mt={1} />

          <Text>
            The return value of the <Text bold inline monospace>mage_ai.clean</Text> method
            is a Pandas dataframe that has been cleaned using
            all the actions in your data pipeline.
          </Text>

          <Spacing mt={2}>
            <CodeEditor
              maxLines={MAX_LINES_EXPORT_2}
              minLines={MAX_LINES_EXPORT_2}
              mode="python"
              readOnly
              setOptions={READ_ONLY}
              style={{
                backgroundColor: themeContext.monotone.grey100,
                fontFamily: MONO_FONT_FAMILY_REGULAR,
                fontSize: REGULAR_FONT_SIZE,
                lineHeight: `${REGULAR_LINE_HEIGHT}px`,
                overflow: 'auto',
                tabSize: 4,
                width: 'inherit',
              }}
              value={SAMPLE_CLEAN_CODE_EXAMPLE}
            />
          </Spacing>
        </Spacing>
      </PanelOld>

      <Spacing mb={5} />

      <PanelOld
        containedWidth
        fullWidth
      >
        <Headline level={3}>
          Method 3: API key
        </Headline>

        <Spacing my={3}>
          <Divider />
        </Spacing>
        
        {apiKeyProvided
          ? (
            <Spacing mb={5}>
              <Spacing mb={1}>
                <Headline level={4}>
                  Use the mage_ai module with your API key
                </Headline>
              </Spacing>
              <Spacing mb={2}>
                <Text>
                  It looks like you already have an API key connected. All your local pipelines should have
                  been synced with the cloud database. You can now use these pipelines 
                </Text>
              </Spacing>
              <Spacing mb={2}>
                <Text>
                  If you or a collaborator has already synced a pipeline to the cloud, you can simply call
                  the <Text bold inline monospace>mage_ai.clean</Text> function with the dataset and 
                  the <Text inline monospace>remote_pipeline_id</Text>. The pipeline needs to have been synced
                  with the same API key in order for you to use it.
                </Text>
              </Spacing>
              {pipelineMetadata?.remote_id
                ? (
                  <Text>
                    The <Text inline monospace>remote_pipeline_uuid</Text> for this pipeline
                    is <Text bold inline>{pipelineMetadata.remote_id}</Text>.
                  </Text>
                ) : (
                  <Text>
                    This pipeline has not been synced with the cloud database yet. Refer to the code example
                    below to see how to sync your pipelines.
                  </Text>
                )}
              <Spacing mt={2}>
                <CodeEditor
                  maxLines={6}
                  minLines={5}
                  mode="python"
                  readOnly
                  setOptions={READ_ONLY}
                  style={{
                    backgroundColor: themeContext.monotone.grey100,
                    fontFamily: MONO_FONT_FAMILY_REGULAR,
                    fontSize: REGULAR_FONT_SIZE,
                    lineHeight: `${REGULAR_LINE_HEIGHT}px`,
                    overflow: 'auto',
                    tabSize: 4,
                    width: 'inherit',
                  }}
                  value={SAMPLE_USE_API_KEY_EXAMPLE_1(pipelineMetadata?.remote_id)}
                />
              </Spacing>
              <Spacing mt={2}>
                <CodeEditor
                  maxLines={7}
                  minLines={6}
                  mode="python"
                  readOnly
                  setOptions={READ_ONLY}
                  style={{
                    backgroundColor: themeContext.monotone.grey100,
                    fontFamily: MONO_FONT_FAMILY_REGULAR,
                    fontSize: REGULAR_FONT_SIZE,
                    lineHeight: `${REGULAR_LINE_HEIGHT}px`,
                    overflow: 'auto',
                    tabSize: 4,
                    width: 'inherit',
                  }}
                  value={SAMPLE_USE_API_KEY_EXAMPLE_2(pipelineMetadata?.remote_id)}
                />
              </Spacing>
            </Spacing>
          ) : (
            <>
              <Spacing mb={5}>
                <Spacing mb={1}>
                  <Headline level={4}>
                    Create your Mage account and get your workspace's API key
                  </Headline>
                </Spacing>
                <Text>
                  In order to use the API key method, you need to have a Mage account. You can
                  click <Link href="https://www.mage.ai/sign-up">here</Link> to create an account. When you
                  create your account, a workspace will be created for you. You can either use that workspace,
                  or create a new workspace for your organization. Once you've selected the workspace, copy the
                  API key from the <Link href="https://www.mage.ai/dashboard">dashboard</Link> page.
                </Text>
                <ImageStyle
                  src="/images/dashboard-api-key.webp"
                  height={400}
                />
              </Spacing>

              <Spacing mb={5}>
                <Spacing mb={1}>
                  <Headline level={4}>
                    Use the mage_ai module with the API key
                  </Headline>
                </Spacing>
                <Spacing mb={2}>
                  <Text>
                    Once you've copied the API key from the Mage dashboard, run
                    the <Text bold inline monospace>mage_ai.remote_sync</Text> command with the specified API key.
                    This will sync your local files with the cloud database.
                  </Text>
                </Spacing>
                <Spacing mb={2}>
                  <Text>
                    If you or a collaborator has already synced a pipeline to the cloud, you can simply call
                    the <Text bold inline monospace>mage_ai.clean</Text> function with the dataset and 
                    the <Text inline monospace>remote_pipeline_id</Text>. The pipeline needs to have been synced
                    with the same API key in order for you to use it.
                  </Text>
                </Spacing>
                {pipelineMetadata?.remote_id
                  ? (
                    <Text>
                      The <Text inline monospace>remote_pipeline_uuid</Text> for this pipeline
                      is <Text bold inline>{pipelineMetadata.remote_id}</Text>.
                    </Text>
                  ) : (
                    <Text>
                      This pipeline has not been synced with the cloud database yet. Refer to the code example
                      below to see how to sync your pipelines.
                    </Text>
                  )}
                <Spacing mt={2}>
                  <CodeEditor
                    maxLines={4}
                    minLines={5}
                    mode="python"
                    readOnly
                    setOptions={READ_ONLY}
                    style={{
                      backgroundColor: themeContext.monotone.grey100,
                      fontFamily: MONO_FONT_FAMILY_REGULAR,
                      fontSize: REGULAR_FONT_SIZE,
                      lineHeight: `${REGULAR_LINE_HEIGHT}px`,
                      overflow: 'auto',
                      tabSize: 4,
                      width: 'inherit',
                    }}
                    value={SAMPLE_LAUNCH_API_KEY_EXAMPLE_1(pipelineMetadata?.remote_id)}
                  />
                </Spacing>
                <Spacing mt={2}>
                  <CodeEditor
                    maxLines={6}
                    minLines={7}
                    mode="python"
                    readOnly
                    setOptions={READ_ONLY}
                    style={{
                      backgroundColor: themeContext.monotone.grey100,
                      fontFamily: MONO_FONT_FAMILY_REGULAR,
                      fontSize: REGULAR_FONT_SIZE,
                      lineHeight: `${REGULAR_LINE_HEIGHT}px`,
                      overflow: 'auto',
                      tabSize: 4,
                      width: 'inherit',
                    }}
                    value={SAMPLE_LAUNCH_API_KEY_EXAMPLE_2(pipelineMetadata?.remote_id)}
                  />
                </Spacing>
              </Spacing>
            </>
          )
        }
      </PanelOld>
    </DatasetDetail>
  );
}

export default Export;
