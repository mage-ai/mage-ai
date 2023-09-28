import {
  coerceNumber, scaleUtc,
} from '@visx/scale';

export const formatDateAxisLabel = (date: Date) => date.toISOString().slice(0, 10);
export const formatDateTickLabel = (dateString: string) => dateString.slice(0, 10);

const getDateRangeKey = (dateRangeStart, dateRangeEnd) => {
  const formattedDateRangeStart = dateRangeStart.toISOString().slice(0, 10);
  const formattedDateRangeEnd = dateRangeEnd.toISOString().slice(0, 10);
  return `${formattedDateRangeStart}:${formattedDateRangeEnd}`;
};

const getMinMaxDateNumeric = (sortedDates) => (
  [coerceNumber(sortedDates[0]), coerceNumber(sortedDates[sortedDates.length - 1])]
);

export const getXScalePadding = (dataSampleCount: number, width: number, isDateType: boolean): number => {
  if (isDateType) {
    return 0.05;
  } else if (dataSampleCount >= 30 && width < 300) {
    return 0.5;
  } else if (dataSampleCount >= 15) {
    return 0.3;
  } else if (dataSampleCount >= 5) {
    return 0.1;
  } else if (dataSampleCount > 2) {
    return 0.05;
  } else if (dataSampleCount === 2) {
    return 0.025;
  }
  return 0;
};

export const getXScaleDate = (
  data: [string, any][],
  xMax: number,
) => {
  const dateValues = data
    .map(dateTuple => new Date(dateTuple[0]))
    .sort((a: any, b: any) => a - b);

  return scaleUtc({
    domain: getMinMaxDateNumeric(dateValues),
    nice: true,
    range: [0, xMax],
  });
};

export const getDateFrequencyByRange = (
  dataSample: [string, any][],
  xScaleDate,
): { [key: string]: number } => {
  if (xScaleDate === null) {
    return {};
  }

  const dateTicks = xScaleDate.ticks().map(date => date.toISOString());
  const dateFrequencyByRange: { [key: string]: number } = {};
  let currentDateRangeStartIndex = 0;
  let currentDateRangeEndIndex = 1;
  dataSample.forEach(dateTuple => {
    const date = new Date(dateTuple[0]);
    const count = dateTuple[1];

    const currentRangeStartDate: string = dateTicks[currentDateRangeStartIndex];
    const currentRangeEndDate: string = dateTicks[currentDateRangeEndIndex];
    if (!currentRangeStartDate || !currentRangeEndDate) {
      return;
    }

    let dateRangeStart = new Date(currentRangeStartDate);
    let dateRangeEnd = new Date(currentRangeEndDate);
    let dateRangeKey = getDateRangeKey(dateRangeStart, dateRangeEnd);

    if (date >= dateRangeStart && date < dateRangeEnd) {
      dateFrequencyByRange[dateRangeKey] = (dateFrequencyByRange[dateRangeKey] || 0) + count;
    } else {
      while (currentDateRangeEndIndex < dateTicks.length || !dateFrequencyByRange[dateRangeKey]) {
        currentDateRangeStartIndex += 1;
        currentDateRangeEndIndex += 1;
        dateRangeStart = new Date(dateTicks[currentDateRangeStartIndex]);
        dateRangeEnd = new Date(dateTicks[currentDateRangeEndIndex]);
        dateRangeKey = getDateRangeKey(dateRangeStart, dateRangeEnd);
        if (date >= dateRangeStart && date < dateRangeEnd) {
          dateFrequencyByRange[dateRangeKey] = (dateFrequencyByRange[dateRangeKey] || 0) + count;
          return;
        }
      }
    }
  });

  const dateTickRanges = dateTicks.reduce((acc, dateTick, idx, dateTicksArr) => {
    if (idx === 0) {
      return acc;
    }
    const formattedEndDate = formatDateTickLabel(dateTick);
    const formattedStartDate = formatDateTickLabel(dateTicksArr[idx - 1]);
    acc.push(`${formattedStartDate}:${formattedEndDate}`);
    return acc;
  }, []);

  dateTickRanges.forEach((tickRange: string) => {
    dateFrequencyByRange[tickRange] = dateFrequencyByRange[tickRange] || 0;
  });

  return dateFrequencyByRange;
};
