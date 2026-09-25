const store = require('../store.cjs');

function handleTaskList(options = {}) {
  const planning = store.getPlanningData();
  let tasks = planning.cards || [];

  if (options.status && options.status !== 'all') {
    tasks = tasks.filter(t => (t.status || 'todo') === options.status);
  }
  if (options.priority) {
    tasks = tasks.filter(t => (t.priority || 'medium') === options.priority);
  }
  if (options.today) {
    const todayStr = new Date().toISOString().slice(0, 10);
    tasks = tasks.filter(t => t.date === todayStr);
  }
  if (options.date) {
    tasks = tasks.filter(t => t.date === options.date);
  }
  if (options.sprintId || options.sprint) {
    const sprintId = options.sprintId || options.sprint;
    tasks = tasks.filter(t => t.sprintId === sprintId);
  }
  if (options.projectId || options.project) {
    const projectId = options.projectId || options.project;
    tasks = tasks.filter(t => t.projectId === projectId);
  }

  return tasks;
}

function handleTaskCreate(options = {}) {
  if (!options.title) {
    throw new Error("Task title is required (--title=\"...\")");
  }

  // Normalize priority to P1, P2, P3, P4
  let priority = 'P3';
  if (options.priority) {
    const p = options.priority.toLowerCase();
    if (p === 'urgent' || p === 'p1' || p === '1') priority = 'P1';
    else if (p === 'high' || p === 'p2' || p === '2') priority = 'P2';
    else if (p === 'medium' || p === 'normal' || p === 'p3' || p === '3') priority = 'P3';
    else if (p === 'low' || p === 'p4' || p === '4') priority = 'P4';
    else priority = options.priority;
  }

  // Calculate day and period for Weekly Matrix visibility
  let dayKey = options.day || null;
  if (!dayKey && options.date) {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const d = new Date(options.date + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      dayKey = days[d.getDay()];
    }
  }
  const period = options.period || (dayKey ? 'morning' : null);

  const planning = store.getPlanningData();
  const newTask = {
    id: store.randomUUID(),
    title: options.title,
    date: options.date || null,
    time: options.time || null,
    durationMinutes: parseInt(options.duration || options.durationMinutes, 10) || 30,
    priority,
    projectId: options.project || options.projectId || null,
    sprintId: options.sprint || options.sprintId || null,
    tags: Array.isArray(options.tags)
      ? options.tags
      : (typeof options.tags === 'string' ? options.tags.split(',').map(s => s.trim()) : []),
    hasDate: Boolean(options.date),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: options.status || 'todo',
    location: { day: dayKey, period: period },
    order: Date.now(),
    isLocked: false,
    storyPoints: options.storyPoints ? Number(options.storyPoints) : undefined,
    iconEmoji: options.iconEmoji || options.emoji || undefined,
    coverColor: options.coverColor || options.color || undefined
  };

  if (options.reminder) {
    newTask.reminder = {
      preset: options.reminder,
      triggerAt: options.time && options.date
        ? `${options.date}T${options.time}:00`
        : new Date().toISOString(),
      hasFired: false
    };
  }

  planning.cards.push(newTask);
  store.savePlanningData(planning);
  return newTask;
}

function findTask(query) {
  const planning = store.getPlanningData();
  const queryLower = (query || '').toLowerCase().trim();
  const found = planning.cards.find(c =>
    c.id.toLowerCase() === queryLower ||
    c.id.toLowerCase().startsWith(queryLower) ||
    c.title.toLowerCase().includes(queryLower)
  );
  return { planning, task: found };
}

function handleTaskGet(idOrTitle) {
  const { task } = findTask(idOrTitle);
  if (!task) {
    throw new Error(`Task not found matching: "${idOrTitle}"`);
  }
  return task;
}

function handleTaskDone(idOrTitle) {
  const { planning, task } = findTask(idOrTitle);
  if (!task) {
    throw new Error(`Task not found matching: "${idOrTitle}"`);
  }

  const newStatus = task.status === 'done' ? 'todo' : 'done';
  task.status = newStatus;
  task.updatedAt = new Date().toISOString();

  store.savePlanningData(planning);
  return { task, updatedStatus: newStatus };
}

function handleTaskUpdate(idOrTitle, options = {}) {
  const { planning, task } = findTask(idOrTitle);
  if (!task) {
    throw new Error(`Task not found matching: "${idOrTitle}"`);
  }

  if (options.title) task.title = options.title;
  if (options.status) task.status = options.status;
  if (options.priority) task.priority = options.priority;
  if (options.date !== undefined) {
    task.date = options.date === 'none' || options.date === 'null' ? null : options.date;
    task.hasDate = Boolean(task.date);
  }
  if (options.time !== undefined) {
    task.time = options.time === 'none' || options.time === 'null' ? null : options.time;
  }
  if (options.duration || options.durationMinutes) {
    task.durationMinutes = parseInt(options.duration || options.durationMinutes, 10);
  }
  if (options.sprint !== undefined) task.sprintId = options.sprint;
  if (options.project !== undefined) task.projectId = options.project;
  if (options.storyPoints !== undefined) task.storyPoints = Number(options.storyPoints);

  task.updatedAt = new Date().toISOString();
  store.savePlanningData(planning);
  return task;
}

function handleTaskDelete(idOrTitle) {
  const { planning, task } = findTask(idOrTitle);
  if (!task) {
    throw new Error(`Task not found matching: "${idOrTitle}"`);
  }

  planning.cards = planning.cards.filter(c => c.id !== task.id);
  store.savePlanningData(planning);
  return { deletedId: task.id, title: task.title };
}

module.exports = {
  handleTaskList,
  handleTaskCreate,
  handleTaskGet,
  handleTaskDone,
  handleTaskUpdate,
  handleTaskDelete
};
