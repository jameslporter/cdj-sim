import { View } from 'react-native';
import { useLearnTarget } from '../hooks/useLearningMode';

// A View that learning mode can explain. Use it for screen areas and groups
// of controls (the BPM readout, the rotary selector, a track list); single
// buttons, knobs and faders get this behaviour from their testID already.
export default function LearnView({ learnId, style, children, ...rest }) {
  const learn = useLearnTarget(learnId);
  return (
    <View {...rest} {...learn.props} style={[style, learn.style]}>
      {children}
    </View>
  );
}
