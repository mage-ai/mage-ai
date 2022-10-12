from singer import utils
from sources.base import Source
from typing import List
import singer

LOGGER = singer.get_logger()


class Amplitude(Source):
    def get_key_properties(self, stream_id: str) -> List[str]:
        return ['id']


@utils.handle_top_exception(LOGGER)
def main():
    args = utils.parse_args([])

    source = Amplitude(
        args.config,
        args.state,
        catalog=args.catalog,
        discover_mode=args.discover,
        key_properties=['id'],
    )
    source.process()

if __name__ == '__main__':
    main()
