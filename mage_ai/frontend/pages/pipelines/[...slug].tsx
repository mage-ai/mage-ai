import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import Head from '@oracle/elements/Head';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TripleLayout from '@components/TripleLayout'
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

function PipelineDetail() {
  return (
    <div>
      <Head title="Pipeline detail page" />

      <TripleLayout
        after={
          <div
            style={{
              height: 9999,
            }}
          >
            <Spacing p={2}>
              <Text wind>
                Hey
              </Text>
            </Spacing>
          </div>
        }
        before={
          <div
            style={{
              height: 9999,
            }}
          >
            <Spacing p={2}>
              <Text wind>
                Hey
              </Text>
            </Spacing>
          </div>
        }
      >
        <Spacing p={PADDING_UNITS}>
          <AddNewBlocks />
        </Spacing>
      </TripleLayout>
    </div>
  );
}

export default PipelineDetail;
