from data_cleaner.cleaning_rules.base import BaseRule
from data_cleaner.column_type_detector import REGEX_NUMBER
from data_cleaner.transformer_actions.constants import ActionType
from keyword import iskeyword
import re


class CleanColumnNames(BaseRule):
    INVALID_COLUMN_CHARS = re.compile(r'([^a-z\_0-9])')
    UPPERCASE_PATTERN = re.compile(r'[A-Z]')
    def evaluate(self):
        """
        Rule:
        1. If column name contains an invalid character, suggest cleaning (remove all characters)
        2. If column name is a reserved python keyword, suggest cleaning (pad with symbols)
        3. If column is of mixedcase, suggest cleaning (convert to lowercase)
        4. If column contains only numbers, suggest cleaning (pad with letters)
        5. If column contains dashes, convert to underscore
        """
        matches = []
        for column in self.df_columns:
            if self.INVALID_COLUMN_CHARS.search(column) != None:
                matches.append(column)
            elif REGEX_NUMBER.search(column) != None:
                matches.append(column)
            else:
                column = column.lower().strip()
                if column == 'true' or column == 'false':
                    matches.append(column)
                elif iskeyword(column):
                    matches.append(column)
        
        suggestions = []
        if len(matches) != 0:
            suggestions.append(self._build_transformer_action_suggestion(
                'Clean dirty column names',
                'The following columns have unclean naming conventions: '
                f'{matches}. '
                'Making these names lowercase and alphanumeric may improve'
                'ease of dataset access and reduce security risks.',
                action_type=ActionType.CLEAN_COLUMN_NAME,
                action_arguments=matches,
                axis='column'
            ))
        
        return suggestions
