import argparse
import os
import subprocess

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--path', type=str)
    args = parser.parse_args()
    path = args.path

    dbt_dirs = []

    dirs = os.listdir(path)
    if 'dbt' in dirs:
        for dir_path in os.listdir(os.path.join(path, 'dbt')):
            dbt_dir = os.path.join(path, 'dbt', dir_path)
            if os.path.isdir(dbt_dir):
                dbt_dirs.append(dbt_dir)

    for dbt_dir in dbt_dirs:
        print(f'Cleaning DBT packages for DBT project {dbt_dir}.')
        subprocess.run(['dbt', 'clean'], cwd=dbt_dir)
        print(f'Installing DBT packages for DBT project {dbt_dir}.')
        subprocess.run(['dbt', 'deps'], cwd=dbt_dir)
        print('')
