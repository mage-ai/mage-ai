export const POSITIVE_QUALITY = ["Good","Best"];
export const NEGATIVE_QUALITY = ["Bad","Worse","Worst"];

export const isBadQuality = (quality: string) => (
    NEGATIVE_QUALITY.includes(quality)
);

export const isGoodQuality = (quality: string) => !isBadQuality(quality);

export const pluralize = (word: string, num: number) => (
    num === 1 ? word : word + 's'
);