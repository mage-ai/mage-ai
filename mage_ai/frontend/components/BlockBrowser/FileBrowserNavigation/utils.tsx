import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import { DBT } from '@oracle/icons';
import { NavLinkUUIDEnum } from './constants';
import { pluralize } from '@utils/string';
import { sortByKey } from '@utils/array';

export function buildNavLinks(cacheItems) {
  return [{
    Icon: DBT,
    label: () => 'All projects',
    uuid: NavLinkUUIDEnum.ALL_PROJECTS,
    // @ts-ignore
  }].concat(sortByKey(cacheItems, ({ item }) => item?.project?.name)?.map(({
    item,
  }) => {
    const project = item?.project;

    return {
      Icon: DBT,
      label: () => (
        <Text monospace noWrapping>
          {project?.name}
        </Text>
      ),
      description: () => (
        <FlexContainer flexDirection="column">
          <Text monospace muted noWrapping small>
            {pluralize('model', item?.models?.length || 0)}
          </Text>

          <Text monospace muted noWrapping small>
            {project?.uuid}
          </Text>
        </FlexContainer>
      ),
      uuid: project?.uuid,
    };
  }));
}
