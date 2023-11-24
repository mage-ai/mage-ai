import { useCallback, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import PredicateGroup from './PredicateGroup';
import Spacing from '@oracle/elements/Spacing';
import {
  HookPredicateType,
  PredicateAndOrOperatorEnum,
  PredicateObjectTypeEnum,
  PredicateOperatorEnum,
  PredicateValueDataTypeEnum,
} from '@interfaces/GlobalHookType';
import { Add } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { removeAtIndex } from '@utils/array';

type PredicateBuilderProps = {
  level: number;
  predicate: HookPredicateType;
  renderPredicate: (opts?: any) => void;
  setPredicate: (predicate: HookPredicateType) => void;
}

const DEFAULT_PREDICATE = {
  and_or_operator: PredicateAndOrOperatorEnum.AND,
  left_value_type: {
    value_data_type: PredicateValueDataTypeEnum.STRING,
  },
  operator: PredicateOperatorEnum.EQUALS,
  right_value_type: {
    value_data_type: PredicateValueDataTypeEnum.STRING,
  },
};

function PredicateBuilder({
  level,
  predicate: predicateProp,
  renderPredicate,
  setPredicate,
}: PredicateBuilderProps) {
  const predicates: HookPredicateType[] = useMemo(() => predicateProp?.predicates || [], [
    predicateProp,
  ]);

  const updatePredicates = useCallback((predicatesData: HookPredicateType[]) => {
    setPredicate({
      predicates: predicatesData,
    });
  }, [
    setPredicate,
  ]);

  const addPredicate = useCallback(() => {
    setPredicate({
      predicates: (predicates || []).concat(DEFAULT_PREDICATE),
    });
  }, [
    predicates,
    setPredicate,
  ]);

  const updatePredicate = useCallback((predicate: HookPredicateType, index: number) => {
    const predicatesNew = [...predicates];
    predicatesNew[index] = predicate;

    setPredicate({
      predicates: predicatesNew,
    });
  }, [
    predicates,
    setPredicate,
  ]);

  const predicatesCount = useMemo(() => predicates?.length || 0, [predicates]);

  return (
    <>
      {predicates?.map((predicate: HookPredicateType, idx: number) => {
        const updatePredicateInner = (data: HookPredicateType) => updatePredicate({
          ...predicate,
          ...data,
        }, idx);

        return (
          <PredicateGroup
            andOrOperator={idx < predicatesCount - 1 ? predicateProp?.and_or_operator : null}
            first={idx === 0}
            index={idx}
            key={`predicate-${idx}`}
            last={idx === predicatesCount - 1}
            level={level + 1}
            predicate={predicate}
            renderPredicate={renderPredicate}
            removePredicate={() => {
              setPredicate({
                ...predicate,
                predicates: removeAtIndex(predicates, idx),
              });
            }}
            updatePredicate={updatePredicateInner}
          >
            <Spacing mt={predicate?.predicates?.length >= 1 ? PADDING_UNITS : 0}>
              {renderPredicate({
                level: level + 1,
                predicate,
                renderPredicate,
                setPredicate: updatePredicateInner,
              })}
            </Spacing>
          </PredicateGroup>
        );
      })}

      <Spacing mt={PADDING_UNITS}>
        <Button
          compact={level >= 0}
          beforeIcon={<Add />}
          onClick={() => addPredicate()}
          secondary
          small={level >= 0}
        >
          Add predicate
        </Button>
      </Spacing>
    </>
  );
}

export default PredicateBuilder;
