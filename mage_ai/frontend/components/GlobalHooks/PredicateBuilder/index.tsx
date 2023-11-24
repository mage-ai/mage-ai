import { useCallback, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
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
  predicate: HookPredicateType;
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
  predicate: predicateProp,
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
      {predicates?.map((predicate: HookPredicateType, idx: number) => (
        <PredicateGroup
          andOrOperator={idx < predicatesCount - 1 ? predicateProp?.and_or_operator : null}
          index={idx}
          key={`predicate-${idx}`}
          last={idx === predicatesCount - 1}
          predicate={predicate}
          removePredicate={() => {
            setPredicate({
              ...predicate,
              predicates: removeAtIndex(predicates, idx),
            });
          }}
          updatePredicate={(data: HookPredicateType) => updatePredicate({
            ...predicate,
            ...data,
          }, idx)}
        />
      ))}

      <Spacing p={PADDING_UNITS}>
        <Button
          beforeIcon={<Add />}
          onClick={() => addPredicate()}
          secondary
        >
          Add predicate group
        </Button>
      </Spacing>
    </>
  );
}

export default PredicateBuilder;
