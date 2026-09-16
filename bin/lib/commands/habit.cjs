const store = require('../store.cjs');

function handleHabitList() {
  const data = store.getHabitsData();
  const todayStr = new Date().toISOString().slice(0, 10);

  return (data.habits || []).map(h => {
    const todayEntry = (data.habitEntries || []).find(e => e.habitId === h.id && e.date === todayStr);
    return {
      id: h.id,
      name: h.name,
      description: h.description,
      period: h.period,
      completedToday: Boolean(todayEntry && todayEntry.completed)
    };
  });
}

function handleHabitCheck(idOrName) {
  const data = store.getHabitsData();
  const q = (idOrName || '').toLowerCase();
  const habit = (data.habits || []).find(h =>
    h.id.toLowerCase() === q || h.name.toLowerCase().includes(q)
  );

  if (!habit) {
    throw new Error(`Habit not found matching: "${idOrName}"`);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  data.habitEntries = data.habitEntries || [];

  let entry = data.habitEntries.find(e => e.habitId === habit.id && e.date === todayStr);
  if (entry) {
    entry.completed = !entry.completed;
  } else {
    entry = {
      id: store.randomUUID(),
      habitId: habit.id,
      date: todayStr,
      completed: true,
      updatedAt: new Date().toISOString()
    };
    data.habitEntries.push(entry);
  }

  store.saveHabitsData(data);
  return { habitId: habit.id, name: habit.name, date: todayStr, completed: entry.completed };
}

module.exports = {
  handleHabitList,
  handleHabitCheck
};
