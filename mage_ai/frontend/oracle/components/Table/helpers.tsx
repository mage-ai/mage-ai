export const CHARACTER_LIMIT = 20;

export const cutTextSize = (
  label: string,
) => (label?.length > CHARACTER_LIMIT) ? `${label?.slice(0, CHARACTER_LIMIT - 3)}...` : (label);
