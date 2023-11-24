import { useCallback, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import PredicateGroup from './PredicateGroup';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import {
  HookPredicateType,
  PredicateAndOrOperatorEnum,
  PredicateObjectTypeEnum,
  PredicateOperatorEnum,
  PredicateValueDataTypeEnum,
} from '@interfaces/GlobalHookType';
import { Add } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { alphabet } from '@utils/string';
import { removeAtIndex } from '@utils/array';

type PredicateBuilderProps = {
  index?: number;
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
  index,
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

  const renderTitle = useCallback((levelInner, indexInner) => {
    if (levelInner < 0) {
      return;
    }

    let letter = alphabet()[indexInner];

    if (levelInner === 0) {
      return letter;
    }

    letter = letter.toLowerCase();

    if (levelInner >= 2) {
      letter = `${letter}${levelInner - 1}`;
    }

    return letter;
  }, []);

  const title = useMemo(() => renderTitle(level, index), [
    renderTitle,
    index,
    level,
  ]);

  return (
    <>
      {predicates?.map((predicate: HookPredicateType, idx: number) => {
        const updatePredicateInner = (data: HookPredicateType) => updatePredicate({
          ...predicate,
          ...data,
        }, idx);

        return (
          <PredicateGroup
            andOrOperator={predicateProp?.and_or_operator}
            first={idx === 0}
            key={`predicate-${idx}`}
            last={idx === predicatesCount - 1}
            level={level + 1}
            predicate={predicate}
            removePredicate={() => {
              setPredicate({
                ...predicate,
                predicates: removeAtIndex(predicates, idx),
              });
            }}
            title={renderTitle(level + 1, idx)}
            updatePredicate={updatePredicateInner}
          >
            <Spacing mt={predicate?.predicates?.length >= 1 ? PADDING_UNITS : 0}>
              {renderPredicate({
                index: idx,
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
        <FlexContainer alignItems="center">
          {level >= 0 && predicates?.length >= 2 && (
            <>
              <Select
                compact
                monospace
                onChange={e => setPredicate({
                  ...predicateProp,
                  and_or_operator: e.target.value,
                })}
                small
                paddingVertical={3}
                value={predicateProp?.and_or_operator}
              >
                {Object.values(PredicateAndOrOperatorEnum).map((value: string) => (
                  <option key={value} value={value}>
                    {(PredicateAndOrOperatorEnum.OR === value ? `${value} ` : value).toUpperCase()}
                  </option>
                ))}
              </Select>

              <Spacing mr={1} />
            </>
          )}

          <Button
            compact={level >= 0}
            beforeIcon={<Add />}
            onClick={() => addPredicate()}
            secondary
            small={level >= 0}
          >
            Add predicate{title && ` in ${title}`}
          </Button>
        </FlexContainer>
      </Spacing>
    </>
  );
}

export default PredicateBuilder;
