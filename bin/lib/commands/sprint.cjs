const store = require('../store.cjs');

function handleSprintList(options = {}) {
  const planning = store.getPlanningData();
  let sprints = planning.projectSprints || [];

  if (options.status && options.status !== 'all') {
    sprints = sprints.filter(s => (s.status || 'planning') === options.status);
  }

  return sprints;
}

function handleSprintCreate(options = {}) {
  if (!options.name) {
    throw new Error("Sprint name is required (--name=\"...\")");
  }

  const planning = store.getPlanningData();
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const newSprint = {
    id: store.randomUUID(),
    name: options.name,
    goal: options.goal || '',
    startDate: options.start || options.startDate || todayStr,
    endDate: options.end || options.endDate || nextTwoWeeks,
    projectIds: Array.isArray(options.projects)
      ? options.projects
      : (options.projects ? options.projects.split(',').map(s => s.trim()) : []),
    status: options.status || 'planning',
    targetStoryPoints: options.points ? Number(options.points) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  planning.projectSprints.push(newSprint);
  store.savePlanningData(planning);
  return newSprint;
}

function findSprint(query) {
  const planning = store.getPlanningData();
  const queryLower = (query || '').toLowerCase().trim();
  const found = (planning.projectSprints || []).find(s =>
    s.id.toLowerCase() === queryLower ||
    s.id.toLowerCase().startsWith(queryLower) ||
    s.name.toLowerCase().includes(queryLower)
  );
  return { planning, sprint: found };
}

function handleSprintStart(idOrName) {
  const { planning, sprint } = findSprint(idOrName);
  if (!sprint) {
    throw new Error(`Sprint not found matching: "${idOrName}"`);
  }
  sprint.status = 'active';
  sprint.updatedAt = new Date().toISOString();
  store.savePlanningData(planning);
  return sprint;
}

function handleSprintComplete(idOrName) {
  const { planning, sprint } = findSprint(idOrName);
  if (!sprint) {
    throw new Error(`Sprint not found matching: "${idOrName}"`);
  }
  sprint.status = 'completed';
  sprint.updatedAt = new Date().toISOString();
  store.savePlanningData(planning);
  return sprint;
}

function handleSprintVelocity() {
  const planning = store.getPlanningData();
  const sprints = planning.projectSprints || [];
  const cards = planning.cards || [];

  return sprints.map(s => {
    const sprintCards = cards.filter(c => c.sprintId === s.id);
    const totalPoints = sprintCards.reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    const completedPoints = sprintCards.filter(c => c.status === 'done').reduce((acc, c) => acc + (c.storyPoints || 1), 0);
    return {
      sprintId: s.id,
      name: s.name,
      status: s.status,
      totalCards: sprintCards.length,
      totalPoints,
      completedPoints,
      completionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0
    };
  });
}

module.exports = {
  handleSprintList,
  handleSprintCreate,
  handleSprintStart,
  handleSprintComplete,
  handleSprintVelocity
};
