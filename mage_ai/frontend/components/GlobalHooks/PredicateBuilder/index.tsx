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
      and_or_operator: PredicateAndOrOperatorEnum.OR,
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

  return (
    <>
      {predicates?.map((predicate: HookPredicateType, idx: number) => (
        <PredicateGroup
          key={`predicate-${idx}`}
          predicate={predicate}
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
          Add predicate
        </Button>
      </Spacing>
    </>
  );
}

export default PredicateBuilder;
