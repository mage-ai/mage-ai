import DatasetDetail, { DatasetDetailSharedProps } from '../Detail';
import Divider from '@oracle/elements/Divider';
import FeatureSetType from '@interfaces/FeatureSetType';
import Headline from '@oracle/elements/Headline';
import PanelOld from '@oracle/components/PanelOld';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

function Export({
  featureSet,
  ...props
}: DatasetDetailSharedProps) {
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
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean a varius magna.
            Mauris eget consectetur urna. Integer sed volutpat justo, sed maximus mauris.
            Sed eros sem, pharetra vel magna et, porta pretium felis.
            Nam ut nisl ac orci scelerisque bibendum vel non nulla.
            Donec mattis quis metus id ultricies. Maecenas sit amet sapien magna.
            Ut ut neque metus. Nulla pretium eget lacus eget posuere.
          </Text>
        </Spacing>

        <Spacing mb={5}>
          <Spacing mb={1}>
            <Headline>
              Upload the pipeline JSON file to your environment
            </Headline>
          </Spacing>
          <Text>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean a varius magna.
            Mauris eget consectetur urna. Integer sed volutpat justo, sed maximus mauris.
            Sed eros sem, pharetra vel magna et, porta pretium felis.
            Nam ut nisl ac orci scelerisque bibendum vel non nulla.
            Donec mattis quis metus id ultricies. Maecenas sit amet sapien magna.
            Ut ut neque metus. Nulla pretium eget lacus eget posuere.
          </Text>
        </Spacing>

        <Spacing mb={5}>
          <Spacing mb={1}>
            <Headline>
              Load your data
            </Headline>
          </Spacing>
          <Text>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean a varius magna.
            Mauris eget consectetur urna. Integer sed volutpat justo, sed maximus mauris.
            Sed eros sem, pharetra vel magna et, porta pretium felis.
            Nam ut nisl ac orci scelerisque bibendum vel non nulla.
            Donec mattis quis metus id ultricies. Maecenas sit amet sapien magna.
            Ut ut neque metus. Nulla pretium eget lacus eget posuere.
          </Text>
        </Spacing>

        <Spacing mb={3}>
          <Spacing mb={1}>
            <Headline>
              Call the <Headline bold inline monospace>
                clean
              </Headline> method
            </Headline>
          </Spacing>
          <Text>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean a varius magna.
            Mauris eget consectetur urna. Integer sed volutpat justo, sed maximus mauris.
            Sed eros sem, pharetra vel magna et, porta pretium felis.
            Nam ut nisl ac orci scelerisque bibendum vel non nulla.
            Donec mattis quis metus id ultricies. Maecenas sit amet sapien magna.
            Ut ut neque metus. Nulla pretium eget lacus eget posuere.
          </Text>
        </Spacing>
      </PanelOld>

      <Spacing mb={8} />

      <PanelOld
        containedWidth
        fullWidth
      >
        <Headline level={2}>
          Method 2: API key
        </Headline>

        <Spacing my={3}>
          <Divider />
        </Spacing>
      </PanelOld>
    </DatasetDetail>
  );
}

export default Export;
