import { Dispatch, SetStateAction } from 'react';
import NextLink from 'next/link';

import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import MenuContainer from './MenuContainer';
import { capitalize } from '@utils/string';

type LinkType = {
  afterElement?: any;
  disabled?: boolean;
  iconName?: string;
  label: string;
  linkProps?: {
    as?: string;
    href: string;
  };
  onClick?: (e?: any) => void;
  title?: string;
  uuid: string;
};

export type LinkGroupType = {
  links: LinkType[];
  uuid: string;
};

export type MenuProps = {
  left?: number;
  linkGroups?: LinkGroupType[];
  onClick?: (e?: any, uuid?: string) => void;
  onCloseMenu?: Dispatch<SetStateAction<boolean>>;
  right?: number;
  top?: number;
  width?: number;
};

function Menu({
  onCloseMenu,
  left,
  linkGroups,
  onClick,
  right,
  top,
  width,
}: MenuProps) {
  return (
    <MenuContainer
      left={left}
      right={right}
      top={top}
      width={width}
    >
      {linkGroups?.map(({
        links,
        uuid: uuidGroup,
      }: LinkGroupType, idx: number) => (
        <div key={uuidGroup}>
          {idx >= 1 && (
            <Spacing my={1} px={2}>
              <Divider />
            </Spacing>
          )}

          {links.map(({
            afterElement,
            label,
            linkProps,
            onClick: onClickLink,
            uuid,
          }: LinkType) => {
            const text = capitalize(label);
            const key = uuid || text;

            let linkEl = (
              <Link
                block
                fullWidth
                key={key}
                onClick={(e) => {
                  onCloseMenu?.(false);
                  onClick?.(e);
                  onClickLink?.(e);
                }}
                preventDefault={(onClick || onClickLink) && !linkProps}
                sameColorAsText
              >
                <Spacing
                  px="4px"
                  py={1}
                >
                  {text}
                </Spacing>
              </Link>
            );

            if (linkProps) {
              linkEl = (
                <NextLink
                  {...linkProps}
                  key={key}
                  passHref
                >
                  {linkEl}
                </NextLink>
              );
            }

            if (afterElement) {
              return (
                <FlexContainer
                  alignItems="center"
                  justifyContent="space-between"
                  key={key}
                >
                  <Flex flex={1}>
                    {linkEl}
                  </Flex>

                  <Spacing
                    py={1}
                  >
                    {afterElement}
                  </Spacing>
                </FlexContainer>
              );
            }

            return linkEl;
          })}
        </div>
      ))}
    </MenuContainer>
  );
}

export default Menu;
