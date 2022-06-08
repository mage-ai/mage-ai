import setuptools


def readme():
    with open("README.md", encoding="utf8") as f:
        README = f.read()
    return README


requirements, dependency_links = [], []
with open('requirements.txt') as f:
    for line in f.read().splitlines():
        if line.startswith('-e git+'):
            dependency_links.append(line.replace('-e ', ''))
        else:
            requirements.append(line)

setuptools.setup(
    name='mage-ai',
    version='0.0.1',
    author='Mage',
    author_email="sales@mage.ai",
    description='Mage - An open-source data management platform that helps you '
                'clean data and prepare it for training AI/ML models',
    long_description=readme(),
    long_description_content_type="text/markdown",
    url='https://github.com/mage-ai/mage-ai',
    packages=setuptools.find_packages('./'),
    include_package_data=True,
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: Apache Software License',
        'Operating System :: OS Independent',
    ],
    install_requires=requirements,
    dependency_links=dependency_links,
    python_requires='>=3.6',
    entry_points={},
    extras_require={}
)
