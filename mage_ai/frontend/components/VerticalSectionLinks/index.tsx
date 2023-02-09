import NextLink from 'next/link';

import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ItemStyle, SectionTitleStyle } from './index.style';
import { PADDING_VERTICAL_UNITS } from '@oracle/styles/units/spacing';

export type SectionItemType = {
  label?: () => string;
  linkProps?: {
    as?: string;
    href: string;
  };
  onClick?: (e: any) => void;
  uuid: string;
};

export type SectionLinksType = {
  items: SectionItemType[];
  title?: () => string;
  uuid: string;
};

type VerticalSectionLinksProps = {
  isItemSelected?: (item: SectionItemType & {
    uuidWorkspace: string;
  }) => boolean;
  sections: SectionLinksType[];
};

function VerticalSectionLinks({
  isItemSelected,
  sections,
}: VerticalSectionLinksProps) {
  return (
    <Spacing py={PADDING_VERTICAL_UNITS}>
      {sections?.map(({
        items,
        title,
        uuid,
      }) => (
        <Spacing key={uuid}>
          <SectionTitleStyle>
            <Text bold muted small uppercase>
              {title ? title() : uuid}
            </Text>
          </SectionTitleStyle>

          {items?.map((item) => {
            const {
              label,
              linkProps,
              onClick,
              uuid: uuidItem,
            } = item;

            const linkLabel = label ? label() : uuidItem;
            const el = (
              <ItemStyle
                selected={isItemSelected?.({
                ...item,
                uuidWorkspace: uuid,
                })}
              >
                {linkLabel}
              </ItemStyle>
            );

            if (linkProps) {
              return (
                <NextLink
                  {...linkProps}
                  key={uuidItem}
                  passHref
                >
                  <Link
                    block
                    noHoverUnderline
                    noOutline
                    sameColorAsText
                  >
                    {el}
                  </Link>
                </NextLink>
              );
            }

            return (
              <Link
                block
                key={uuidItem}
                noHoverUnderline
                noOutline
                onClick={onClick}
                preventDefault
                sameColorAsText
              >
                {el}
              </Link>
            );
          })}
        </Spacing>
      ))}
    </Spacing>
  );
}

export default VerticalSectionLinks;
