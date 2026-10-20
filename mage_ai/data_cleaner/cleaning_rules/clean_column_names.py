from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.column_types.column_type_detector import REGEX_NUMBER
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, NameConventionPatterns
from keyword import iskeyword


class CleanColumnNames(BaseRule):
    def is_dirty(self, name):
        if NameConventionPatterns.NON_ALNUM.search(name):
            return True
        if REGEX_NUMBER.match(name) is not None:
            return True

        if iskeyword(name):
            return True
        if NameConventionPatterns.SNAKE.match(name):
            return False
        if NameConventionPatterns.LOWERCASE.match(name):
            return False
        return True

    def evaluate(self):
        """
        Rule:
        1. If column name contains an nonalphanumeric character (except _),
           suggest cleaning (remove all characters)
        2. If the column name is a number, suggest cleaning (prefix with 'number_')
        3. If the column name is a reseved keyword, suggest cleaning (postfix with '_')
        4. If the column name is not snake_case, suggest cleaning
           (convert to snakecase from pascal case, camel case, uppercase)
        """
        matches = list(filter(self.is_dirty, self.df_columns))
        suggestions = []
        if len(matches) != 0:
            suggestions.append(
                self._build_transformer_action_suggestion(
                    'Clean dirty column names',
                    'Format these column names as lowercase and alphanumeric to improve '
                    'accessibility and security.',
                    action_type=ActionType.CLEAN_COLUMN_NAME,
                    action_arguments=matches,
                    axis='column',
                )
            )

        return suggestions
