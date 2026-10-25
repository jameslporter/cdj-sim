import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { learnEntryFor } from '../constants/learningContent';
import { learningMode, shownLearnId, useLearningMode } from '../hooks/useLearningMode';
import DrillsView from './DrillsView';

const ACCENT = '#4fc3f7';

// The LEARN switch and, while learning mode is on, the explanation panel
// along the bottom of the screen. The panel takes its own space below the
// decks and mixer (it doesn't cover them), and every control keeps working
// while it's open. The DRILLS tab has guided exercises; `getDrillState`
// gives them the decks and mixer to check.
export default function LearningPanel({ getDrillState }) {
  const [tab, setTab] = useState('controls');
  const enabled = useLearningMode((s) => s.enabled);
  const shownId = useLearningMode(shownLearnId);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    learningMode.restore();
  }, []);

  if (!enabled) {
    return (
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          testID="learn-toggle"
          accessibilityRole="button"
          accessibilityLabel="Turn on learning mode"
          onPress={() => learningMode.setEnabled(true)}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <Text style={styles.fabIcon}>?</Text>
          <Text style={styles.fabText}>LEARN</Text>
        </Pressable>
      </View>
    );
  }

  const entry = shownId ? learnEntryFor(shownId) : null;
  const wide = width >= 820;
  const maxHeight =
    tab === 'drills' ? Math.max(200, Math.min(420, height * 0.5)) : Math.max(150, Math.min(260, height * 0.38));

  return (
    <View testID="learn-panel" style={[styles.panel, { maxHeight }]}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>LEARNING MODE</Text>
        </View>
        {[
          ['controls', 'CONTROLS'],
          ['drills', 'DRILLS'],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            testID={`learn-tab-${key}`}
            onPress={() => {
              setTab(key);
              if (key === 'controls') learningMode.setDrillTargets([]);
            }}
            style={[styles.tab, tab === key && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
        <Text style={styles.area} numberOfLines={1}>
          {tab === 'controls' ? (entry?.area ?? '') : ''}
        </Text>
        <Pressable
          testID="learn-exit"
          accessibilityRole="button"
          accessibilityLabel="Turn off learning mode"
          onPress={() => learningMode.setEnabled(false)}
          style={({ pressed }) => [styles.exit, pressed && styles.pressed]}
          hitSlop={8}
        >
          <Text style={styles.exitText}>EXIT ✕</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {tab === 'drills' ? (
          <DrillsView getState={getDrillState} />
        ) : entry ? (
          <>
            <Text testID="learn-title" style={styles.title}>
              {entry.title}
            </Text>
            <View style={[styles.sections, wide && styles.sectionsWide]}>
              <Section label="WHAT IT DOES" text={entry.what} wide={wide} />
              <Section label="HOW DJS USE IT" text={entry.how} wide={wide} />
              {entry.tip ? <Section label="TRY IT" text={entry.tip} wide={wide} accent /> : null}
            </View>
            {entry.note ? <Text style={styles.note}>In this simulator: {entry.note}</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.title}>Tap any control to learn what it does</Text>
            <Text style={styles.text}>
              Buttons, knobs, faders, the jog wheel, parts of the screen and the mixer all have an explanation.
              {Platform.OS === 'web' ? ' With a mouse, you can also just hover over them.' : ''} Everything keeps
              working while learning mode is on, so you can try each control as you read about it.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ label, text, wide, accent }) {
  return (
    <View style={[styles.section, wide && styles.sectionWide]}>
      <Text style={[styles.sectionLabel, accent && styles.sectionLabelAccent]}>{label}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0f2530',
    borderWidth: 1,
    borderColor: ACCENT,
    boxShadow: '0px 4px 14px rgba(0, 0, 0, 0.7)',
  },
  fabIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 22,
  },
  fabText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  pressed: {
    opacity: 0.7,
  },
  panel: {
    backgroundColor: '#0d1418',
    borderTopWidth: 2,
    borderTopColor: ACCENT,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    backgroundColor: ACCENT,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#33505e',
  },
  tabOn: {
    borderColor: ACCENT,
    backgroundColor: '#0f2530',
  },
  tabText: {
    color: '#8aa4b0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tabTextOn: {
    color: ACCENT,
  },
  area: {
    flex: 1,
    color: '#8aa4b0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  exit: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#33505e',
  },
  exitText: {
    color: '#cfe3ec',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingTop: 8,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sections: {
    gap: 8,
  },
  sectionsWide: {
    flexDirection: 'row',
    gap: 20,
  },
  section: {
    gap: 2,
  },
  sectionWide: {
    flex: 1,
  },
  sectionLabel: {
    color: '#8aa4b0',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionLabelAccent: {
    color: ACCENT,
  },
  text: {
    color: '#dde8ed',
    fontSize: 13,
    lineHeight: 19,
  },
  note: {
    color: '#f0b45a',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
