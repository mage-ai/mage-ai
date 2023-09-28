import { Dispatch, SetStateAction } from 'react';
import NextLink from 'next/link';

import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import MenuContainer from './MenuContainer';

export type LinkType = {
  afterElement?: any;
  beforeIcon?: any;
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
            beforeIcon,
            label,
            linkProps,
            onClick: onClickLink,
            uuid,
          }: LinkType) => {
            const key = uuid || label;

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
                  {label}
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

            return (
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
                key={key}
              >
                <Flex alignItems="center" flex={1}>
                  {beforeIcon &&
                    <>
                      {beforeIcon}
                      <Spacing mr="4px" />
                    </>
                  }
                  {linkEl}
                </Flex>

                {afterElement &&
                  <Spacing
                    py={1}
                  >
                    {afterElement}
                  </Spacing>
                }
              </FlexContainer>
            );
          })}
        </div>
      ))}
    </MenuContainer>
  );
}

export default Menu;
