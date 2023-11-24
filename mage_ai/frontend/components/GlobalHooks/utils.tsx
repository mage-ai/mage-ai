import PredicateBuilder from './PredicateBuilder';
import { HookPredicateType } from '@interfaces/GlobalHookType';

export function renderPredicate({
  index,
  level,
  predicate,
  renderPredicate,
  setPredicate,
}: {
  index?: number;
  level: number;
  predicate: HookPredicateType;
  renderPredicate: (opts?: any) => void;
  setPredicate: (predicate: HookPredicateType) => void;
}) {
  return (
    <PredicateBuilder
      index={index}
      level={level}
      predicate={predicate}
      renderPredicate={renderPredicate}
      setPredicate={setPredicate}
    />
  );
}
