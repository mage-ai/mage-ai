from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF
import numpy as np

EARTH_RADIUS = 6371


class DistanceBetween(BaseUDF):
    def execute(self):
        def __haversine(lat1, lng1, lat2, lng2):
            lat1, lng1, lat2, lng2 = np.radians([lat1, lng1, lat2, lng2])
            a = np.sin((lat2-lat1)/2.0)**2 + \
                np.cos(lat1) * np.cos(lat2) * np.sin((lng2-lng1)/2.0)**2
            return EARTH_RADIUS * 2 * np.arcsin(np.sqrt(a))
        return __haversine(
            self.df[self.arguments[0]],
            self.df[self.arguments[1]],
            self.df[self.arguments[2]],
            self.df[self.arguments[3]],
        )
