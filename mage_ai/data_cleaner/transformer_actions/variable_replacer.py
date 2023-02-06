from mage_ai.data_cleaner.transformer_actions.constants import VariableType
import re


def interpolate(text, key, variable_data):
    """
    text:
        string to operate on
    key:
        key to search within text
    variable_data:
        dictionary containing data used to interpolate
    """

    regex_replacement = key
    if variable_data['type'] == VariableType.FEATURE:
        regex_replacement = variable_data[VariableType.FEATURE]['uuid']
    elif variable_data['type'] == VariableType.FEATURE_SET_VERSION:
        regex_replacement = \
            variable_data[VariableType.FEATURE_SET_VERSION][VariableType.FEATURE_SET]['uuid']

    regex_pattern = re.compile(
        r'\%__BRACKETS_START__{}__BRACKETS_END__'
        .format(key)
        .replace('__BRACKETS_START__', r'\{')
        .replace('__BRACKETS_END__', r'\}')
    )

    return re.sub(regex_pattern, regex_replacement, str(text))


def replace_true_false(action_code):
    regex_pattern_true = re.compile(' true')
    regex_pattern_false = re.compile(' false')

    return re.sub(
        regex_pattern_true,
        ' True',
        re.sub(regex_pattern_false, ' False', action_code),
    )
