from collections import deque


def build_custom_action_decorator(action_list):
    def custom_action(function):
        action_list.append(function)
        return function

    return custom_action


def execute_custom_action(df, action, **kwargs):
    """
    Handles custom action generation and execution. Custom actions are currently supported in two
    different ways:
    - `transformer_action` decorator: any function decorated with `@transformer_action` will be
    executed afterwards as a custom action. All functions must accept a Pandas dataframe and
    return a Pandas dataframe. Functions decorated with `@transformer_action` are
    executed in the order of their definition.

    - Script style: entering a script into the action code menu will execute the script. The script
     will have access to the dataframe through the `df` variable and must mutate it before
     completion in order to apply the correct action.

    If both custom actions and scripts are provided, the scripts will be executed before the
    custom actions.

    Below is an example of a user defined custom transformer action
    ```python
    @transformer_action
    def transform(df: pandas.DataFrame) -> pandas.DataFrame:
        df['total'] = df.sum(axis=0)
        return df
    ```

    Below is a python script performing the same function that can be run by this function:
    ```python
    df['total'] = df.sum(axis=0)
    ```
    """
    custom_actions = deque()
    transformer_action = build_custom_action_decorator(custom_actions)
    action_code = action['action_code']
    action_code = action_code.replace('\t', ' ' * 4)
    exec(action_code, {'df': df, 'transformer_action': transformer_action})
    while len(custom_actions) != 0:
        df = custom_actions.popleft()(df)
    return df
