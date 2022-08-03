from mage_ai.autocomplete.utils import extract_all_imports
import re


def convert_to_block(block, content):
    block_template_content = block.to_dict(include_content=True)['content']
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

    before_decorator = '\n'.join(block_template_content_parts[:decorator_index]).strip()
    after_decorator = '\n'.join(block_template_content_parts[decorator_index:]).strip()

    converted_imports = '\n'.join(sorted(block_template_imports + content_imports)).strip()

    return f"""{converted_imports}


{before_decorator}


{content.strip()}


{after_decorator}"""
