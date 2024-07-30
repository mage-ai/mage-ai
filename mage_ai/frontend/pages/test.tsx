import Ansi from 'ansi-to-react';
import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Spacing from '@oracle/elements/Spacing';
import FlexContainer from '@oracle/components/FlexContainer';
import Flex from '@oracle/components/Flex';
import useErrorViews from '@components/ErrorPopup/useErrorViews';
import useEventStreams from '@utils/server/events/useEventStreams';
import { DATE_FORMAT_LONG_MS } from '@utils/date';
import moment from 'moment';
import TextArea from '@oracle/elements/Inputs/TextArea';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import { ErrorDetailsType } from 'interfaces/ErrorsType';
import EventStreamType, { ResultType } from '@interfaces/EventStreamType';
import { padString } from '@utils/string';
import Link from '@oracle/elements/Link';


function Test({ uuid }: { uuid: string }) {
  return (
    <FlexContainer>
      <Flex direction="column" grow>
        <NextLink href="/v2/pipelines/rag1/builder/rag" passHref>
          <Link>
            RAG
          </Link>
        </NextLink>
      </Flex>
    </FlexContainer>
  )
}

Test.getInitialProps = async (ctx: any) => {
  const { uuid }: { uuid?: string } = ctx.query;

  return {
    uuid,
  };
};

export default Test;
