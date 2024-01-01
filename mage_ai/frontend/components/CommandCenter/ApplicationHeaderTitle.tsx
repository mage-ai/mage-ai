import { CommandCenterItemType, ItemApplicationType } from '@interfaces/CommandCenterType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ApplicationProps, CurrentType } from './ItemApplication/constants';
import { HeaderSubtitleStyle } from './index.style';
import { ItemApplicationTypeEnum, OBJECT_TITLE_MAPPING } from '@interfaces/CommandCenterType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { getIcon } from './ItemRow/constants';
import { getIconColor } from './ItemRow/index.style';

function ApplicationHeaderTitle({
  application,
  applicationsRef,
  item,
}: {
  application: ItemApplicationType;
  applicationsRef: {
    current: CurrentType[];
  };
  item: CommandCenterItemType;
}) {
  let title;
  let Icon;
  let iconColor;

  if (applicationsRef?.current?.length >= 2) {
    const applicationConfigPrev = applicationsRef?.current?.[1];
    const itemPrev = applicationConfigPrev?.item;

    if (item?.uuid !== itemPrev?.uuid) {
      Icon = getIcon(itemPrev);
      iconColor = getIconColor(itemPrev);
      title = itemPrev?.title;
    }
  }

  return (
    <FlexContainer alignItems="center" fullHeight fullWidth justifyContent="space-between">
      <Flex alignItems="center" flex={1}>
        <div style={{ marginRight: 1 * UNIT }} />

        {Icon && (
          <>
            <Icon
              fill={iconColor?.accent}
              size={2 * UNIT}
            />

            <div style={{ marginRight: 1.5 * UNIT }} />
          </>
        )}

        <Text weightStyle={4}>
          {title}
        </Text>

        <Spacing mr={PADDING_UNITS} />
      </Flex>

      {ItemApplicationTypeEnum.DETAIL_LIST !== application?.application_type && (
        <HeaderSubtitleStyle>
          <Text muted>
            {capitalizeRemoveUnderscoreLower(OBJECT_TITLE_MAPPING[item?.object_type] || '')}
          </Text>
        </HeaderSubtitleStyle>
      )}
    </FlexContainer>
  );
}

export default ApplicationHeaderTitle;
