from mage_integrations.sources.base import Source, main
from typing import Dict, Generator, List
import requests


class Titanic(Source):
    def load_data(
        self,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        url = 'https://raw.githubusercontent.com/mage-ai/datasets/master/titanic_survival.csv'
        text = requests.get(url).text

        rows = []
        lines = text.rstrip().split('\n')
        columns = lines[0].split(',')

        for line in lines[1:]:
            values = line.split(',')
            rows.append({col: values[idx] for idx, col in enumerate(columns)})

        yield rows


if __name__ == '__main__':
    main(Titanic)
