import { useMemo } from 'react';

import Chip from '@oracle/components/Chip';
import FlexContainer from '@oracle/components/FlexContainer';
import TagType from '@interfaces/TagType';
import Text from '@oracle/elements/Text';
import { sortByKey } from '@utils/array';

type TagsContainerProps = {
  onClickTag?: (tag: TagType) => void;
  tags: TagType[];
};

function TagsContainer({
  onClickTag,
  tags = [],
}: TagsContainerProps) {
  const tagsCount = useMemo(() => tags?.length || 0, [tags]);
  const tagsSorted = useMemo(() => sortByKey(tags || [], 'uuid'), [tags]);

  return (
    <FlexContainer alignItems="center" flexWrap="wrap">
      {tagsSorted?.reduce((acc, tag: TagType) => {
        acc.push(
          <div
            key={`tag-${tag.uuid}`}
            style={{
              marginBottom: 2,
              marginRight: tagsCount >= 2 ? 4 : 0,
              marginTop: 2,
            }}
          >
            <Chip
              onClick={onClickTag ? () => onClickTag(tag) : null}
              small
            >
              <Text>
                {tag.uuid}
              </Text>
            </Chip>
          </div>,
        );

        return acc;
      }, [])}
    </FlexContainer>
  );
}

export default TagsContainer;
