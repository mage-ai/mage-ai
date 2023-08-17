import React from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import { DARK_CONTENT_DEFAULT } from '@oracle/styles/colors/content';
import { PaginateArrowLeft, PaginateArrowRight } from '@oracle/icons';
import { PURPLE } from '@oracle/styles/colors/main';
import { UNIT } from '@oracle/styles/units/spacing';

type PaginateProps = {
  page: number;
  maxPages: number;
  onUpdate: (page: number) => void;
  totalPages: number;
};

export const ROW_LIMIT = 30;
export const MAX_PAGES = 9;

function Paginate({
  page,
  maxPages: maxPagesProp,
  onUpdate,
  totalPages,
}: PaginateProps) {

  let pageArray = [];

  let maxPages = maxPagesProp;
  if (maxPages > totalPages) {
    pageArray = Array.from({ length: totalPages }, (_, i) => i);
  } else {
    const interval = Math.floor(maxPages / 2);
    let minPage = page - interval;
    if (page + interval >= totalPages) {
      minPage = totalPages - maxPages + 2;
      maxPages -= 2;
    } else if (page - interval <= 0) {
      minPage = 0;
      maxPages -= 2;
    } else {
      maxPages -= 4;
      minPage = page - Math.floor(maxPages / 2);
    }
  
    pageArray = Array.from({ length: maxPages }, (_, i) => i + minPage);
  }

  return (
    <>
      {totalPages > 0 && (
        <FlexContainer alignItems="center">
          <Button
            disabled={page === 0}
            onClick={() => onUpdate(page - 1)}
          >
            <PaginateArrowLeft size={1.5 * UNIT} stroke={DARK_CONTENT_DEFAULT} />
          </Button>
          {!pageArray.includes(0) && (
            <>
              <Spacing key={0} ml={1}>
                <Button
                  borderLess
                  noBackground
                  onClick={() => onUpdate(0)}
                >
                  {1}
                </Button>
              </Spacing>
              {!pageArray.includes(1) && (
                <Spacing key={0} ml={1}>
                  <Button
                    noBackground
                    noPadding
                    notClickable
                  >
                    ...
                  </Button>
                </Spacing>
              )}
            </>
          )}
          {pageArray.map((p) => (
            <Spacing key={p} ml={1}>
              <Button
                backgroundColor={p === page && PURPLE}
                borderLess
                noBackground
                notClickable={p === page}
                onClick={() => {
                  if (p !== page) {
                    onUpdate(p);
                  }
                }}
              >
                {p + 1}
              </Button>
            </Spacing>
          ))}
          {!pageArray.includes(totalPages - 1) && (
            <>
              {!pageArray.includes(totalPages - 2) && (
                <Spacing key={0} ml={1}>
                  <Button
                    noBackground
                    noPadding
                    notClickable
                  >
                    ...
                  </Button>
                </Spacing>
              )}
              <Spacing key={totalPages - 1} ml={1}>
                <Button
                  borderLess
                  noBackground
                  onClick={() => onUpdate(totalPages - 1)}
                >
                  {totalPages}
                </Button>
              </Spacing>
            </>
          )}
          <Spacing ml={1} />
          <Button
            disabled={page === totalPages - 1}
            onClick={() => onUpdate(page + 1)}
          >
            <PaginateArrowRight size={1.5 * UNIT} stroke={DARK_CONTENT_DEFAULT} />
          </Button>
        </FlexContainer>
      )}
    </>
  );
}

export default Paginate;
