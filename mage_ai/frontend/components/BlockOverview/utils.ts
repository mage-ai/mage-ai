import { roundNumber } from '@utils/string';

export const buildHeatmapData = (correlations) => {
    const xyLabels = [];

    const heatmapData = correlations?.map(({
        correlations: c,
        feature: { uuid },
      }, idx: number) => {
        xyLabels.push({
          label: uuid,
        });
    
        const arr = c[0].y.map(({ value }) => roundNumber(value));
        arr.splice(idx, 0, 1);
    
        return arr;
    });

    return {
        heatmapData,
        xyLabels,
    };
};
