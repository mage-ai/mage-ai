import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import {
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { PaginateArrowRight } from '@oracle/icons';
import { TAB_BRANCHES } from '../constants';

function Remote() {
  return (
    <>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <Divider light />
        </Spacing>

        <FlexContainer>
          <Button
            afterIcon={<PaginateArrowRight />}
            linkProps={{
              href: `/version-control?tab=${TAB_BRANCHES.uuid}`,
            }}
            noHoverUnderline
            sameColorAsText
            secondary
          >
            Next: {TAB_BRANCHES.uuid}
          </Button>
        </FlexContainer>
      </Spacing>
    </>
  );
}

export default Remote;
