from collections import deque


def build_custom_action_decorator(action_list):
    def custom_action(function):
        action_list.append(function)
        return function

    return custom_action


def execute_custom_action(df, action, **kwargs):
    """
    Handles custom action generation and execution. Custom actions are currently supported in two different ways:
    - **`custom_action` decorator**: any function decorated with `@custom_action` will be executed afterwards as a custom action.
    All functions must accept a Pandas dataframe and return a Pandas dataframe. The example below shows an expected function signature:

    - **Script style**: entering a script into the action code menu will execute the script. The script will have access to the dataframe through the
    `df` variable and must mutate it before completion in order to apply the correct action.

    Below is an example of a transformation function that could be given
    ```
    @custom_action
    def transform(df: pandas.DataFrame) -> pandas.DataFrame:
    ```
    """
    custom_actions = deque()
    custom_action = build_custom_action_decorator(custom_actions)
    exec(action['action_code'], {'df': df, 'custom_action': custom_action})
    while len(custom_actions) != 0:
        df = custom_actions.popleft()(df)
    return df
