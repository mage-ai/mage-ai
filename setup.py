import setuptools

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
    description='Mage data cleaning tool',
    url='https://github.com/mage-ai/mage-ai',
    packages=setuptools.find_packages('./mage_ai'),
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
