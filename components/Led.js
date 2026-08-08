import { View } from 'react-native';

export default function Led({ on, color = '#4fd87a', size = 8, style }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: on ? color : '#2a2a2a',
          borderWidth: 1,
          borderColor: on ? color : '#3a3a3a',
        },
        style,
      ]}
    />
  );
}
