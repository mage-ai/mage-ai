import React from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import { PaginateArrowLeft, PaginateArrowRight } from '@oracle/icons';
import { PURPLE } from '@oracle/styles/colors/main';
import { UNIT } from '@oracle/styles/units/spacing';

type PaginateProps = {
  page: number;
  maxPages: number;
  onUpdate: (page: number) => void;
  totalPages: number;
};

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
    <FlexContainer alignItems="center">
      <Button
        onClick={() => onUpdate(page - 1)}
      >
        <PaginateArrowLeft size={1.5 * UNIT} stroke='#AEAEAE' />
      </Button>
      {!pageArray.includes(0) && (
        <>
          <Spacing ml={1} key={0}>
            <Button
              onClick={() => onUpdate(0)}
              borderLess
              noBackground
            >
              {1}
            </Button>
          </Spacing>
          {!pageArray.includes(1) && (
            <Spacing ml={1} key={0}>
              <Button
                notClickable
                noBackground
                noPadding
              >
                ...
              </Button>
            </Spacing>
          )}
        </>
      )}
      {pageArray.map((p) => (
        <Spacing ml={1} key={p}>
          <Button
            onClick={() => {
              if (p !== page) {
                onUpdate(p);
              }
            }}
            notClickable={p === page}
            backgroundColor={p === page && PURPLE}
            borderLess
            noBackground
          >
            {p + 1}
          </Button>
        </Spacing>
      ))}
      {!pageArray.includes(totalPages - 1) && (
        <>
          {!pageArray.includes(totalPages - 2) && (
            <Spacing ml={1} key={0}>
              <Button
                notClickable
                noBackground
                noPadding
              >
                ...
              </Button>
            </Spacing>
          )}
          <Spacing ml={1} key={totalPages - 1}>
            <Button
              onClick={() => onUpdate(totalPages - 1)}
              borderLess
              noBackground
            >
              {totalPages}
            </Button>
          </Spacing>
        </>
      )}
      <Spacing ml={1} />
      <Button
        onClick={() => onUpdate(page + 1)}
      >
        <PaginateArrowRight size={1.5 * UNIT} stroke='#AEAEAE' />
      </Button>
    </FlexContainer>
  )
}

export default Paginate;
