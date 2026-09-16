const store = require('../store.cjs');

function handleStatus() {
  return store.getSystemStatus();
}

function handleSync() {
  store.touchSyncFlag();
  return {
    success: true,
    timestamp: Date.now(),
    message: "Triggered .cli-sync-flag. Active Organon windows will reload state."
  };
}

module.exports = {
  handleStatus,
  handleSync
};
