const store = require('../store.cjs');

function handleProjectList() {
  const data = store.getProjectsData();
  return data.projects || [];
}

function handleProjectCreate(options = {}) {
  if (!options.name) {
    throw new Error("Project name is required (--name=\"...\")");
  }

  const data = store.getProjectsData();
  const newProject = {
    id: store.randomUUID(),
    name: options.name,
    description: options.desc || options.description || '',
    color: options.color || '#3b82f6',
    path: options.path || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.projects.push(newProject);
  store.saveProjectsData(data);
  return newProject;
}

module.exports = {
  handleProjectList,
  handleProjectCreate
};
