#!/usr/bin/env node

/**
 * Organon Headless CLI for Planning Engine
 * Executes CRUD commands and broadcasts an IPC sync event to the React app.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');

// Resolve data directory similarly to how electron app does it, fallback to default structure on different OS
let dataDir;
if (process.env.ORGANON_DATA_DIR) {
    dataDir = process.env.ORGANON_DATA_DIR;
} else {
    switch (os.platform()) {
        case 'win32':
            dataDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Organon');
            break;
        case 'darwin':
            dataDir = path.join(os.homedir(), 'Library', 'Application Support', 'Organon');
            break;
        default:
            dataDir = path.join(os.homedir(), '.config', 'Organon');
    }
}

const planningPath = path.join(dataDir, 'store', 'planning.json');

const readStore = () => {
    try {
        if (fs.existsSync(planningPath)) {
            const data = fs.readFileSync(planningPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error reading planning data:", e);
    }
    return { cards: [], projectSprints: [] };
}

const writeStore = (data) => {
    try {
        if (!fs.existsSync(path.dirname(planningPath))) {
            fs.mkdirSync(path.dirname(planningPath), { recursive: true });
        }
        fs.writeFileSync(planningPath, JSON.stringify(data, null, 2), 'utf-8');
        console.log("Planning state updated successfully.");
        touchSyncFile();
    } catch (e) {
        console.error("Error writing planning data:", e);
    }
}

const touchSyncFile = () => {
    try {
        const syncFlag = path.join(dataDir, 'store', '.cli-sync-flag');
        if (!fs.existsSync(path.dirname(syncFlag))) {
            fs.mkdirSync(path.dirname(syncFlag), { recursive: true });
        }
        fs.writeFileSync(syncFlag, Date.now().toString(), 'utf-8');
    } catch (e) {
        console.error("Error triggering sync flag", e);
    }
}

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
    console.log("Usage: organon plan <command> [options]");
    process.exit(1);
}

const parseArgs = (argsArray) => {
    const options = {};
    for (let i = 0; i < argsArray.length; i++) {
        if (argsArray[i].startsWith('--')) {
            const key = argsArray[i].replace('--', '');
            const value = argsArray[i+1] && !argsArray[i+1].startsWith('--') ? argsArray[i+1] : true;
            options[key] = value;
            if (value !== true) i++;
        }
    }
    return options;
}

const options = parseArgs(args.slice(1));
const storeData = readStore();

if (command === 'task:create') {
    const newTask = {
        id: randomUUID(),
        title: options.title || "New Task",
        date: options.date || null,
        time: options.time || null,
        durationMinutes: parseInt(options.duration) || 30,
        priority: options.priority || 'medium',
        projectId: options.project || null,
        sprintId: options.sprint || null,
        tags: options.tags ? options.tags.split(',') : [],
        hasDate: !!options.date,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'todo',
        location: { day: null, period: null },
        order: storeData.cards ? storeData.cards.length : 0,
        isLocked: false
    };

    if (options.reminder) {
        newTask.reminder = {
            preset: options.reminder,
            triggerAt: new Date().toISOString(), // Simplified for now
            hasFired: false
        }
    }

    storeData.cards = storeData.cards || [];
    storeData.cards.push(newTask);
    writeStore(storeData);
    console.log(JSON.stringify(newTask, null, 2));
} else if (command === 'task:list') {
    // List tasks
    console.log(JSON.stringify(storeData.cards || [], null, 2));
} else if (command === 'sprint:create') {
    const newSprint = {
        id: randomUUID(),
        name: options.name || "New Sprint",
        goal: options.goal || "",
        startDate: options.start || new Date().toISOString().slice(0, 10),
        endDate: options.end || new Date().toISOString().slice(0, 10),
        projectIds: options.projects ? options.projects.split(',') : [],
        status: 'planning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
    storeData.projectSprints = storeData.projectSprints || [];
    storeData.projectSprints.push(newSprint);
    writeStore(storeData);
    console.log(JSON.stringify(newSprint, null, 2));
} else {
    console.log("Unknown command:", command);
}
