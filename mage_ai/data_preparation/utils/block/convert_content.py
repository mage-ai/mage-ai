from mage_ai.autocomplete.utils import extract_all_imports
from mage_ai.data_preparation.models.constants import BlockType
import re


def convert_to_block(block, content):
    block_template_content = block.content
    content_imports = extract_all_imports(content, ignore_nesting=True)
    block_template_imports = extract_all_imports(block_template_content, ignore_nesting=True)

    for i in content_imports:
        content = content.replace(i, '')
    for i in block_template_imports:
        block_template_content = block_template_content.replace(i, '')

    content = content.strip()
    block_template_content = block_template_content.strip()

    block_template_content_parts = block_template_content.split('\n')
    decorator_index = None
    for i, line in enumerate(block_template_content_parts):
        if decorator_index is not None:
            break
        if re.search(f'@{block.type}', line):
            decorator_index = i

    decorator_function_started = False
    decorator_index_end = None
    block_template_content_parts2 = block_template_content_parts[decorator_index:]
    final_function_in_content = False
    for i, line in enumerate(block_template_content_parts2):
        if decorator_index_end is not None:
            break

        if not decorator_function_started and not re.search(r'^[\w@]+', line):
            decorator_function_started = True

        if decorator_function_started:
            if re.search(r'^[\w]+', line):
                decorator_index_end = i - 1
            elif i == len(block_template_content_parts2) - 1:
                decorator_index_end = i
                final_function_in_content = True

    converted_imports = '\n'.join(sorted(block_template_imports + content_imports)).strip()

    decorator_function_parts = '\n'.join(
        block_template_content_parts[decorator_index:decorator_index + decorator_index_end],
    ).strip().split('\n')

    content_parts = content.split('\n')
    content_to_display = []
    for i, line in enumerate(content_parts):
        if len(content_parts) - 1 == i and \
                block.type in [BlockType.DATA_LOADER, BlockType.TRANSFORMER]:
            content_to_display.append(f'    return {line}')
        else:
            content_to_display.append(f'    {line}')

    if final_function_in_content:
        part_3 = '\n'.join(decorator_function_parts).strip()
        part_5 = ''
    else:
        part_3 = '\n'.join(decorator_function_parts[:-2]).strip()
        part_5 = '\n'.join(
            block_template_content_parts[decorator_index + decorator_index_end:]
        ).strip()

    return """{}


{}


{}

{}


{}""".format(
        converted_imports,
        '\n'.join(block_template_content_parts[:decorator_index]).strip(),
        part_3,
        '\n'.join(content_to_display),
        part_5,
    )
