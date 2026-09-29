const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const builder = JSON.parse(fs.readFileSync(path.join(root, 'electron-builder.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(root, 'config', 'release-channel-policy.json'), 'utf8'));
const args = process.argv.slice(2);
const readArg = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const channel = readArg('--channel') || policy.defaultChannel;
const version = readArg('--version') || packageJson.version;

assert.strictEqual(policy.schemaVersion, 1);
assert.ok(['stable', 'canary'].includes(channel), `Canal não suportado: ${channel}`);
assert.ok(policy.channels[channel]);
assert.ok(new RegExp(policy.channels[channel].versionPattern).test(version), `Versão ${version} incompatível com ${channel}`);
assert.ok(policy.channels.canary.initialStagingPercentage < policy.channels.stable.initialStagingPercentage);
assert.strictEqual(policy.promotion.reuseBrokenVersion, false);
assert.strictEqual(policy.rollback.allowAutomaticDowngrade, false);
assert.strictEqual(policy.rollback.requireHigherVersion, true);
assert.strictEqual(builder.nsis.deleteAppDataOnUninstall, false);
assert.strictEqual(builder.publish.provider, 'github');
assert.strictEqual(builder.publish.releaseType, 'release');
assert.strictEqual(builder.generateUpdatesFilesForAllChannels, true);
assert.match(builder.win.artifactName, /\$\{version\}/);

process.stdout.write(`${JSON.stringify({
  releasePolicy: 'ok',
  channel,
  version,
  stagingPercentage: policy.channels[channel].initialStagingPercentage,
  automaticDowngrade: false,
  preservesAppDataOnUninstall: true,
})}\n`);
