import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DRILLS } from '../constants/drills';
import { learningMode } from '../hooks/useLearningMode';
import { loadJSON, saveJSON } from '../utils/storage';

const ACCENT = '#4fc3f7';
const DRILL = '#ffb238';
const DONE_KEY = 'cdj-sim:drills-done:v1';
const CHECK_MS = 250;

// Guided drills in the learning panel. Pick a drill; each step tells you
// what to do, outlines the control(s) to use in orange, and ticks itself off
// when the sim sees you've done it. `getState()` returns what the steps check.
export default function DrillsView({ getState }) {
  const [done, setDone] = useState([]);
  const [drillId, setDrillId] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const memo = useRef({});

  useEffect(() => {
    loadJSON(DONE_KEY, []).then((saved) => Array.isArray(saved) && setDone(saved));
  }, []);

  const drill = DRILLS.find((d) => d.id === drillId) ?? null;
  const step = drill?.steps[stepIndex] ?? null;
  const finished = drill && stepIndex >= drill.steps.length;

  // Point at the current step's controls.
  useEffect(() => {
    learningMode.setDrillTargets(step?.targets ?? []);
  }, [step]);
  useEffect(() => () => learningMode.setDrillTargets([]), []);

  // Watch for the step being done.
  useEffect(() => {
    if (!step?.check) return undefined;
    memo.current = {};
    const id = setInterval(() => {
      let ok = false;
      try {
        ok = step.check({ ...getState(), memo: memo.current });
      } catch {
        ok = false;
      }
      if (ok) setStepIndex((i) => i + 1);
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [step, getState]);

  // Remember finished drills.
  useEffect(() => {
    if (finished && !done.includes(drill.id)) {
      const next = [...done, drill.id];
      setDone(next);
      saveJSON(DONE_KEY, next);
    }
  }, [finished, drill, done]);

  const start = (id) => {
    const next = DRILLS.find((d) => d.id === id);
    try {
      next?.setup?.(getState());
    } catch {
      // a drill's setup is a convenience; carry on without it
    }
    setDrillId(id);
    setStepIndex(0);
  };

  if (!drill) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Guided drills</Text>
        <Text style={styles.text}>
          Short exercises for the core gig skills. Each step lights up the control to use and ticks itself off when you
          get it right.
        </Text>
        <View style={styles.cards}>
          {DRILLS.map((d) => (
            <Pressable key={d.id} testID={`drill-${d.id}`} onPress={() => start(d.id)} style={styles.card}>
              <Text style={styles.cardSkill}>{d.skill.toUpperCase()}</Text>
              <Text style={styles.cardTitle}>
                {done.includes(d.id) ? '✓ ' : ''}
                {d.title}
              </Text>
              <Text style={styles.cardSteps}>{d.steps.length} steps</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.drillHeader}>
        <Text style={styles.title}>{drill.title}</Text>
        <Pressable testID="drill-back" onPress={() => setDrillId(null)} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>ALL DRILLS</Text>
        </Pressable>
      </View>
      <Text style={styles.intro}>{drill.intro}</Text>
      <View style={styles.steps}>
        {drill.steps.map((s, i) => {
          const state = i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo';
          return (
            <View key={i} testID={`drill-step-${i}`} style={[styles.step, state === 'current' && styles.stepCurrent]}>
              <Text style={[styles.stepMark, state === 'done' && styles.stepMarkDone]}>
                {state === 'done' ? '✓' : `${i + 1}`}
              </Text>
              <Text style={[styles.stepText, state === 'todo' && styles.stepTextTodo]}>{s.text}</Text>
            </View>
          );
        })}
      </View>
      {finished ? (
        <View style={styles.doneRow}>
          <Text testID="drill-complete" style={styles.doneText}>
            Drill complete! Run it again until it feels natural, or try another.
          </Text>
          <Pressable testID="drill-restart" onPress={() => start(drill.id)} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>AGAIN</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.doneRow}>
          <Pressable testID="drill-skip" onPress={() => setStepIndex((i) => i + 1)} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>{step?.check ? 'SKIP STEP' : 'NEXT'}</Text>
          </Pressable>
          <Pressable testID="drill-restart" onPress={() => start(drill.id)} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>RESTART</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  text: {
    color: '#dde8ed',
    fontSize: 13,
    lineHeight: 19,
  },
  intro: {
    color: '#b8cad3',
    fontSize: 12,
    lineHeight: 17,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: 190,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2b4350',
    backgroundColor: '#11202a',
    gap: 3,
  },
  cardSkill: {
    color: ACCENT,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cardSteps: {
    color: '#8aa4b0',
    fontSize: 11,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  steps: {
    gap: 4,
  },
  step: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stepCurrent: {
    borderColor: DRILL,
    backgroundColor: '#2a2110',
  },
  stepMark: {
    width: 18,
    color: DRILL,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  stepMarkDone: {
    color: '#4fd87a',
  },
  stepText: {
    flex: 1,
    color: '#eef4f7',
    fontSize: 13,
    lineHeight: 18,
  },
  stepTextTodo: {
    color: '#6f8792',
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  doneText: {
    color: '#4fd87a',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#33505e',
  },
  smallButtonText: {
    color: '#cfe3ec',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
