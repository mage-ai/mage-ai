export default function DashedDivider({
  backgroundColorName = 'backgrounds-body',
  foregroundColorName = 'colors-graymd',
  height = 1,
  length = 2,
  spacing = 2,
  vertical = false,
  width = '100%',
}: {
  backgroundColorName?: string;
  foregroundColorName?: string;
  height?: number | string;
  length?: number;
  spacing?: number;
  vertical?: boolean;
  width?: number | string;
}) {
  return (
    <div
      style={{
        background: `repeating-linear-gradient(
          ${vertical ? '0deg' : '90deg'},
          var(--${foregroundColorName}) 0 ${length}px,
          var(--${backgroundColorName}) 0 ${length + spacing}px
        )`,
        height: vertical ? '100%' : height,
        width: vertical ? height : width,
      }}
    ></div>
  );
}
