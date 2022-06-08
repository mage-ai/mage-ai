import React, { useContext } from 'react';
import dynamic from 'next/dynamic';
import { ThemeContext } from 'styled-components';
import '@uiw/react-textarea-code-editor/dist.css';

import Button from '@oracle/elements/Button';
import DatasetDetail, { DatasetDetailSharedProps } from '../Detail';
import Divider from '@oracle/elements/Divider';
import FeatureSetType from '@interfaces/FeatureSetType';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PanelOld from '@oracle/components/PanelOld';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { REGULAR_FONT_SIZE, REGULAR_LINE_HEIGHT} from '@oracle/styles/fonts/sizes';

const CodeEditor = dynamic(
  () => import('@uiw/react-textarea-code-editor').then((mod) => mod.default),
  {
    ssr: false,
  },
);

function download(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

const SAMPLE_CLEAN_CODE_EXAMPLE = `import mage_ai
import pandas as pd


df = pd.read_csv('/datasets/training_data.csv') # Load the data
mage_ai.clean(df, pipeline_config_path='/path_to_json_file.json')`;

function Export({
  featureSet,
  ...props
}: DatasetDetailSharedProps) {
  const themeContext = useContext(ThemeContext);

  const {
    metadata,
  } = featureSet || {};

  return (
    <DatasetDetail
      {...props}
      featureSet={featureSet}
    >
      <Spacing mb={5}>
        <Headline level={1}>
          Export data pipeline for <Headline
            bold
            inline
            level={2}
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
        <Headline level={2}>
          Method 1: local JSON file
        </Headline>

        <Spacing my={3}>
          <Divider />
        </Spacing>

        <Spacing mb={5}>
          <Spacing mb={1}>
            <Headline>
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
                  const pipeline = JSON.stringify(featureSet?.pipeline);
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
            <Headline>
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
            <Headline>
              Call the <Headline bold inline monospace>
                clean
              </Headline> method
            </Headline>
          </Spacing>
          <Text>
            Load your data as a Pandas dataframe, then
            invoke the cleaning method by passing in the dataframe variable as the first argument
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
              // @ts-ignore
              disabled
              // @ts-ignore
              language="python"
              padding={UNIT * 1}
              style={{
                backgroundColor: themeContext.monotone.grey100,
                fontFamily: MONO_FONT_FAMILY_REGULAR,
                fontSize: REGULAR_FONT_SIZE,
                lineHeight: `${REGULAR_LINE_HEIGHT}px`,
                tabSize: 4,
              }}
              value={SAMPLE_CLEAN_CODE_EXAMPLE}
            />
          </Spacing>
        </Spacing>
      </PanelOld>

      <Spacing mb={8} />

      <PanelOld
        containedWidth
        fullWidth
      >
        <Headline level={2}>
          [WIP] Method 2: API key
        </Headline>

        <Spacing my={3}>
          <Divider />
        </Spacing>

        <Text>
          Coming soon...
        </Text>
      </PanelOld>
    </DatasetDetail>
  );
}

export default Export;
