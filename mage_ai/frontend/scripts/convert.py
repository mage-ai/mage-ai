# # noqa
# import json
# import re


# def convert_scss_to_css(scss_file, css_file, namespace, mode):
#     # Regular expression to match SCSS variable definitions
#     var_pattern = re.compile(r'^\$([\w-]+):\s*([^;]+);')

#     with open(scss_file, 'r') as infile, open(css_file, 'w') as outfile:
#         outfile.write(
#             """@use '../abstracts/colors/{mode}' as colors;
# @mixin mode() {{
# """.format(mode=mode)
#         )

#         for line in infile:
#             match = var_pattern.match(line.strip())
#             if match:
#                 var_name, _ = match.groups()
#                 css_var_name = f'--{var_name}'
#                 # Properly escape the SCSS variable reference within the CSS custom property
#                 scss_var_ref = f'#{{{namespace}.${var_name}}}'
#                 outfile.write(f'  {css_var_name}: {scss_var_ref};\n')

#         outfile.write('}\n')


# # Define input and output file paths and namespace
# for mode in ['light', 'dark']:
#     scss_file = f'abstracts/colors/_{mode}.scss'
#     css_file = f'modes/_{mode}.scss'
#     namespace = 'colors'  # Adjust the namespace according to your SCSS
#     print('WTF mode', mode)
#     convert_scss_to_css(scss_file, css_file, namespace, mode)


# # Convert SCSS to CSS custom properties referencing original variables with namespace

# # # -----------------------------------------


# # def format_var_name(*args):
# #     return '-'.join(args).lower().replace('_', '-')


# # def extract_scss(variables, parent_keys=[]):
# #     scss_lines = []
# #     for key, value in variables.items():
# #         if isinstance(value, dict):
# #             scss_lines.extend(extract_scss(value, parent_keys + [key]))
# #         else:
# #             var_name = '$' + format_var_name(*parent_keys, key)
# #             scss_lines.append(f'{var_name}: {value};')
# #     return scss_lines


# # with open('light.json', 'r') as json_file:
# #     json_data = json.load(json_file)
# #     scss_lines = extract_scss(json_data)

# #     with open('_light.scss', 'w') as scss_file:
# #         scss_file.write('\n'.join(scss_lines))

# #     print('SCSS variables have been successfully written to styles.scss')
