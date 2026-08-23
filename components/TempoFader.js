import VerticalFader from './VerticalFader';

export default function TempoFader({ pitch, range, onChange, testID }) {
  return (
    <VerticalFader
      value={pitch}
      min={-range}
      max={range}
      step={0.1}
      centerTick
      onChange={onChange}
      testID={testID}
    />
  );
}
