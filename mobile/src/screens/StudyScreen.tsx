import React, { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { now, today, formatMinutes } from '../utils/date'
import { uid } from '../utils/format'

type TimerState = 'idle' | 'focus' | 'break'

export function StudyScreen() {
  const theme = useTheme()
  const { store, addStudyGoal, deleteStudyGoal, addStudySession, updateStudySettings } = useStore()

  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [secondsLeft, setSecondsLeft] = useState(store.study.focusMinutes * 60)
  const [showSettings, setShowSettings] = useState(false)
  const [showGoalSheet, setShowGoalSheet] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [focusInput, setFocusInput] = useState(String(store.study.focusMinutes))
  const [breakInput, setBreakInput] = useState(String(store.study.breakMinutes))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const focusStartRef = useRef(0)

  // Reset timer display when idle and settings change
  useEffect(() => {
    if (timerState === 'idle') setSecondsLeft(store.study.focusMinutes * 60)
  }, [store.study.focusMinutes, timerState])

  const clearTimer = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  const startTick = (onDone: () => void) => {
    clearTimer()
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearTimer()
          onDone()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startFocus = () => {
    focusStartRef.current = Date.now()
    setSecondsLeft(store.study.focusMinutes * 60)
    setTimerState('focus')
    startTick(() => {
      const elapsed = Math.round((Date.now() - focusStartRef.current) / 1000)
      addStudySession({ id: uid(), completedAt: now(), focusSeconds: elapsed })
      setTimerState('idle')
      Alert.alert('Foco concluído!', `Sessão de ${formatMinutes(Math.round(elapsed / 60))} registrada.\nHora do intervalo?`, [
        { text: 'Iniciar intervalo', onPress: startBreak },
        { text: 'Parar', style: 'cancel' },
      ])
    })
  }

  const startBreak = () => {
    setSecondsLeft(store.study.breakMinutes * 60)
    setTimerState('break')
    startTick(() => {
      setTimerState('idle')
      Alert.alert('Intervalo concluído!', 'Hora de focar novamente.', [
        { text: 'Iniciar foco', onPress: startFocus },
        { text: 'Parar', style: 'cancel' },
      ])
    })
  }

  const stopTimer = () => {
    clearTimer()
    setTimerState('idle')
    setSecondsLeft(store.study.focusMinutes * 60)
  }

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [])

  const handleSaveSettings = () => {
    const fm = Math.max(1, Math.min(180, parseInt(focusInput) || 25))
    const bm = Math.max(1, Math.min(60, parseInt(breakInput) || 5))
    updateStudySettings(fm, bm)
    setShowSettings(false)
  }

  const handleAddGoal = () => {
    if (!goalTitle.trim()) return
    addStudyGoal({ id: uid(), title: goalTitle.trim(), status: 'todo', createdAt: now() })
    setGoalTitle('')
    setShowGoalSheet(false)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const todayStr = today()
  const todaySessions = store.study.sessions.filter(s => s.completedAt.startsWith(todayStr))
  const totalFocusToday = todaySessions.reduce((acc, s) => acc + s.focusSeconds, 0)

  const ringColor = timerState === 'focus' ? theme.primary : timerState === 'break' ? '#22c55e' : theme.text + '25'

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    timerSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
    stateLabel: {
      color: timerState === 'focus' ? theme.primary : timerState === 'break' ? '#22c55e' : theme.text + '60',
      fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
    },
    timerRing: {
      width: 180, height: 180, borderRadius: 90,
      borderWidth: 4, borderColor: ringColor,
      alignItems: 'center', justifyContent: 'center', marginBottom: 32,
    },
    timerText: { fontSize: 48, fontWeight: '700', color: theme.text, letterSpacing: 2 },
    timerSub: { color: theme.text + '50', fontSize: 12, marginTop: 4 },
    controls: { flexDirection: 'row', gap: 12 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    btnTxt: { fontWeight: '700', fontSize: 15 },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
    statTxt: { color: theme.text + '60', fontSize: 13 },
    section: { paddingHorizontal: 16, marginTop: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { flex: 1, color: theme.text + '80', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    goalRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 8, padding: 12, marginBottom: 6, gap: 10 },
    goalTxt: { flex: 1, color: theme.text, fontSize: 14 },
    sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.text + '10' },
    sessionTxt: { color: theme.text + '80', fontSize: 13 },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header
        title="Estudo"
        rightIcon="settings"
        onRightPress={() => {
          setFocusInput(String(store.study.focusMinutes))
          setBreakInput(String(store.study.breakMinutes))
          setShowSettings(true)
        }}
      />

      <ScrollView style={s.scroll}>
        {/* Timer */}
        <View style={s.timerSection}>
          <Text style={s.stateLabel}>
            {timerState === 'idle' ? 'Pronto' : timerState === 'focus' ? 'Foco' : 'Intervalo'}
          </Text>

          <View style={s.timerRing}>
            <Text style={s.timerText}>{timeStr}</Text>
            <Text style={s.timerSub}>
              {timerState === 'focus' ? 'Focando...' : timerState === 'break' ? 'Descansando...' : `${store.study.focusMinutes}min foco`}
            </Text>
          </View>

          <View style={s.controls}>
            {timerState === 'idle' ? (
              <TouchableOpacity style={[s.btn, { backgroundColor: theme.primary }]} onPress={startFocus}>
                <Text style={[s.btnTxt, { color: '#fff' }]}>▶  Iniciar Foco</Text>
              </TouchableOpacity>
            ) : (
              <>
                {timerState === 'focus' && (
                  <TouchableOpacity style={[s.btn, { backgroundColor: theme.surface }]} onPress={startBreak}>
                    <Text style={[s.btnTxt, { color: theme.text }]}>☕ Intervalo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.btn, { backgroundColor: '#ef444420' }]} onPress={stopTimer}>
                  <Text style={[s.btnTxt, { color: '#ef4444' }]}>■  Parar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={s.statRow}>
            <Feather name="clock" size={14} color={theme.text + '50'} />
            <Text style={s.statTxt}>
              Hoje: {formatMinutes(Math.round(totalFocusToday / 60))} · {todaySessions.length} sessões
            </Text>
          </View>
        </View>

        {/* Goals */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Objetivos</Text>
            <TouchableOpacity onPress={() => { setGoalTitle(''); setShowGoalSheet(true) }}>
              <Feather name="plus" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
          {store.study.goals.length === 0 && (
            <Text style={{ color: theme.text + '40', fontSize: 13, paddingVertical: 8 }}>Nenhum objetivo ainda</Text>
          )}
          {store.study.goals.map(goal => (
            <View key={goal.id} style={s.goalRow}>
              <Feather
                name={goal.status === 'done' ? 'check-circle' : 'circle'}
                size={18}
                color={goal.status === 'done' ? '#22c55e' : theme.text + '40'}
              />
              <Text style={[s.goalTxt, goal.status === 'done' && { textDecorationLine: 'line-through', color: theme.text + '50' }]}>
                {goal.title}
              </Text>
              <TouchableOpacity onPress={() =>
                Alert.alert('Excluir', `Excluir "${goal.title}"?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', style: 'destructive', onPress: () => deleteStudyGoal(goal.id) },
                ])
              }>
                <Feather name="trash-2" size={15} color={theme.text + '30'} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Session History */}
        <View style={[s.section, { marginTop: 20, marginBottom: 40 }]}>
          <Text style={s.sectionTitle}>Histórico de sessões</Text>
          {store.study.sessions.length === 0 && (
            <Text style={{ color: theme.text + '40', fontSize: 13, paddingVertical: 8 }}>Nenhuma sessão concluída ainda</Text>
          )}
          {[...store.study.sessions].slice(0, 20).map(session => (
            <View key={session.id} style={s.sessionRow}>
              <Feather name="zap" size={14} color={theme.primary} />
              <Text style={s.sessionTxt}>{formatMinutes(Math.round(session.focusSeconds / 60))} de foco</Text>
              <Text style={[s.sessionTxt, { marginLeft: 'auto' }]}>{session.completedAt.slice(0, 10)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Timer Settings */}
      <BottomSheet visible={showSettings} onClose={() => setShowSettings(false)} title="Configurações do timer" onSave={handleSaveSettings}>
        <FormInput
          label="Tempo de foco (minutos)"
          value={focusInput}
          onChangeText={setFocusInput}
          keyboardType="number-pad"
          placeholder="25"
        />
        <FormInput
          label="Tempo de intervalo (minutos)"
          value={breakInput}
          onChangeText={setBreakInput}
          keyboardType="number-pad"
          placeholder="5"
        />
        <View style={{ height: 20 }} />
      </BottomSheet>

      {/* Goal Sheet */}
      <BottomSheet visible={showGoalSheet} onClose={() => setShowGoalSheet(false)} title="Novo objetivo" onSave={handleAddGoal}>
        <FormInput label="Objetivo *" value={goalTitle} onChangeText={setGoalTitle} placeholder="Ex: Terminar capítulo 3..." autoFocus />
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
