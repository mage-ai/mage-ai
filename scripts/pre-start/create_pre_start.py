import argparse

from jinja2 import Template

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--template-path', help='Path')

    args, _ = parser.parse_known_args()

    with open('/app/pre-start.py') as f:
        custom_code = f.read()

    with open(args.template_path) as f:
        file = Template(f.read()).render(
            config_code=custom_code,
        )

    with open(args.template_path.replace('_template', ''), 'w') as f:
        f.write(file)
