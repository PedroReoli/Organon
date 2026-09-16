const { execSync } = require('child_process');

try {
    const res = execSync('node scripts/plan-cli.cjs task:create --title "Test task"', { encoding: 'utf-8' });
    console.log('CLI output:', res);
} catch (e) {
    console.error('CLI error:', e.message);
}
