import setuptools


def readme():
    with open('README.md', encoding='utf8') as f:
        README = f.read()
    return README


requirements = []
with open('requirements.txt') as f:
    for line in f.read().splitlines():
        requirements.append(line)

setuptools.setup(
    name='mage-ai',
    version='0.2.0',
    author='Mage',
    author_email='eng@mage.ai',
    description='Mage is a notebook for building and deploying data pipelines.',
    long_description=readme(),
    long_description_content_type='text/markdown',
    url='https://github.com/mage-ai/mage-ai',
    packages=setuptools.find_packages('./'),
    include_package_data=True,
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: Apache Software License',
        'Operating System :: OS Independent',
    ],
    install_requires=requirements,
    python_requires='>=3.6',
    entry_points={
        'console_scripts': [
            'mage=mage_ai.command_line:main',
        ],
    },
    extras_require={},
)
