import PredicateBuilder from './PredicateBuilder';
import { HookPredicateType } from '@interfaces/GlobalHookType';

export function renderPredicate({
  level,
  predicate,
  renderPredicate,
  setPredicate,
}: {
  level: number;
  predicate: HookPredicateType;
  renderPredicate: (opts?: any) => void;
  setPredicate: (predicate: HookPredicate) => void;
}) {
  return (
    <PredicateBuilder
      level={level}
      predicate={predicate}
      renderPredicate={renderPredicate}
      setPredicate={setPredicate}
    />
  );
}
