from mage_ai.data_cleaner.cleaning_rules.base import STATUS_COMPLETED
from mage_ai.data_cleaner.cleaning_rules.clean_column_names import CleanColumnNames
from mage_ai.data_cleaner.cleaning_rules.fix_syntax_errors import FixSyntaxErrors
from mage_ai.data_cleaner.cleaning_rules.impute_values import ImputeValues
from mage_ai.data_cleaner.cleaning_rules.reformat_values import ReformatValues
from mage_ai.data_cleaner.cleaning_rules.remove_collinear_columns import RemoveCollinearColumns
from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_high_empty_rate import (
    RemoveColumnsWithHighEmptyRate,
)
from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_single_value import (
    RemoveColumnsWithSingleValue,
)
from mage_ai.data_cleaner.cleaning_rules.remove_duplicate_rows import RemoveDuplicateRows
from mage_ai.data_cleaner.cleaning_rules.remove_outliers import (
    RemoveOutliers,
    REMOVE_OUTLIERS_TITLE,
)
from mage_ai.data_cleaner.column_types.column_type_detector import infer_column_types
from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.statistics.calculator import StatisticsCalculator
from mage_ai.shared.array import flatten
from mage_ai.shared.constants import SAMPLE_SIZE
from mage_ai.shared.logger import VerboseFunctionExec, timer
import numpy as np

DEFAULT_RULES = [
    CleanColumnNames,
    RemoveColumnsWithHighEmptyRate,
    RemoveColumnsWithSingleValue,
    FixSyntaxErrors,
    ReformatValues,
    ImputeValues,
    RemoveCollinearColumns,
    RemoveDuplicateRows,
    RemoveOutliers,
]


class BasePipeline:
    def __init__(self, actions=[], rules=DEFAULT_RULES, verbose=False):
        self.actions = actions
        self.rules = rules
        self.verbose = verbose

    def create_actions(self, df, column_types, statistics, rule_configs={}):
        if not statistics or len(statistics) == 0:
            calculator = StatisticsCalculator(column_types, self.verbose)
            statistics = calculator.calculate_statistics_overview(df, False)
        self.column_types = column_types
        all_suggestions = []
        for rule in self.rules:
            with timer('pipeline.evaluate_cleaning_rule', dict(rule=rule.__name__), verbose=False):
                with VerboseFunctionExec(
                    f'Evaluating cleaning rule: {rule.__name__}', verbose=self.verbose
                ):
                    rule_config = rule_configs.get(rule.__name__, {})
                    suggestions = \
                        rule(df, column_types, statistics, custom_config=rule_config).evaluate()
            if suggestions:
                all_suggestions += suggestions
        self.actions = all_suggestions
        return all_suggestions

    def create_preview_results(self, df, suggested_actions):
        for action in suggested_actions:
            payload = action['action_payload']
            if payload['axis'] != 'row':
                continue
            df_transformed = BaseAction(payload).execute(df)
            row_removed = df.index.difference(df_transformed.index)
            row_removed = df.index.get_indexer(row_removed)
            row_removed = row_removed[np.where(row_removed <= SAMPLE_SIZE)]
            if len(row_removed) > 0:
                action['preview_results'] = dict(
                    removed_row_indices=row_removed.tolist(),
                )

    def transform(self, df, auto=True):
        if len(self.actions) == 0:
            print('Pipeline is empty.')
            return df
        action_queue = self.actions
        completed_queue = []
        df_transformed = df
        while len(action_queue) != 0:
            action = action_queue.pop(0)
            title = action['title']
            payload = action['action_payload']
            with VerboseFunctionExec(f'Executing cleaning action: {title}', verbose=self.verbose):
                df_transformed = BaseAction(payload).execute(df_transformed)
            action['status'] = STATUS_COMPLETED
            completed_queue.append(action)
            if auto:
                action_queue = self.update_suggestions(df_transformed)
        self.actions = completed_queue
        return df_transformed

    def update_suggestions(self, df_transformed):
        new_column_types = infer_column_types(df_transformed)
        return self.create_actions(df_transformed, new_column_types, {})

    @classmethod
    def deduplicate_suggestions(self, actions, suggestions, statistics):
        """
        Not show duplicate outlier removal suggestions due to column value distribution changes.
        TODO: Figure out a better way to detect outliers.
        """
        columns_with_outlier_removed = set(
            flatten(
                [
                    a['action_payload']['action_arguments']
                    for a in actions
                    if a['title'] == REMOVE_OUTLIERS_TITLE
                ]
            )
        )
        suggestions_filtered = [
            s
            for s in suggestions
            if not (
                s['title'] == REMOVE_OUTLIERS_TITLE
                and len(s['action_payload']['action_arguments']) != 0
                and s['action_payload']['action_arguments'][0] in columns_with_outlier_removed
            )
        ]
        statistics_updated = statistics.copy()
        for col in columns_with_outlier_removed:
            if f'{col}/outlier_count' in statistics_updated:
                statistics_updated[f'{col}/outlier_count'] = 0
                statistics_updated[f'{col}/outliers'] = []
        return suggestions_filtered, statistics_updated
