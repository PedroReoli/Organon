/**
 * Organon AI Tools & Function Calling Schema
 * Allows AI Agents (Jules, Gemini, Claude, OpenAI) to inspect capabilities and execute commands.
 */

const AI_TOOLS_SCHEMA = [
  {
    name: "organon_task_list",
    description: "List tasks from Organon with optional filters (status, priority, today, date, sprint, project).",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["all", "todo", "in_progress", "review", "done", "backlog", "archived"],
          description: "Filter by task status."
        },
        priority: {
          type: "string",
          enum: ["urgent", "high", "medium", "low"],
          description: "Filter by priority level."
        },
        today: {
          type: "boolean",
          description: "If true, only returns tasks scheduled for today."
        },
        date: {
          type: "string",
          description: "Filter tasks by specific date (format: YYYY-MM-DD)."
        },
        sprintId: {
          type: "string",
          description: "Filter tasks belonging to a specific sprint ID."
        },
        projectId: {
          type: "string",
          description: "Filter tasks belonging to a specific project ID."
        }
      }
    }
  },
  {
    name: "organon_task_create",
    description: "Create a new planning task in Organon.",
    parameters: {
      type: "object",
      required: ["title"],
      properties: {
        title: {
          type: "string",
          description: "Title / summary of the task."
        },
        date: {
          type: "string",
          description: "Scheduled date (YYYY-MM-DD)."
        },
        time: {
          type: "string",
          description: "Scheduled start time (HH:mm, e.g. '14:30')."
        },
        durationMinutes: {
          type: "number",
          description: "Estimated duration in minutes (e.g. 30, 60)."
        },
        priority: {
          type: "string",
          enum: ["urgent", "high", "medium", "low"],
          description: "Task priority level (default: medium)."
        },
        projectId: {
          type: "string",
          description: "Associated project ID or name."
        },
        sprintId: {
          type: "string",
          description: "Associated sprint ID."
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "List of tags (e.g. ['backend', 'review'])."
        },
        reminder: {
          type: "string",
          enum: ["at_time", "5m", "15m", "1h", "1d"],
          description: "Reminder alert preset relative to the scheduled time."
        },
        storyPoints: {
          type: "number",
          description: "Scrum story points (1, 2, 3, 5, 8...)."
        },
        iconEmoji: {
          type: "string",
          description: "Emoji icon to represent the task (e.g. 🚀, ⚡, 📝)."
        }
      }
    }
  },
  {
    name: "organon_task_update",
    description: "Update an existing task in Organon by its ID or title search.",
    parameters: {
      type: "object",
      required: ["idOrTitle"],
      properties: {
        idOrTitle: {
          type: "string",
          description: "Task UUID or exact/partial title to find."
        },
        title: {
          type: "string",
          description: "New title for the task."
        },
        status: {
          type: "string",
          enum: ["todo", "in_progress", "review", "done", "backlog", "archived"],
          description: "New status."
        },
        priority: {
          type: "string",
          enum: ["urgent", "high", "medium", "low"],
          description: "New priority level."
        },
        date: {
          type: "string",
          description: "New scheduled date (YYYY-MM-DD or 'none')."
        },
        time: {
          type: "string",
          description: "New scheduled time (HH:mm)."
        }
      }
    }
  },
  {
    name: "organon_task_done",
    description: "Toggle or mark a task as completed.",
    parameters: {
      type: "object",
      required: ["idOrTitle"],
      properties: {
        idOrTitle: {
          type: "string",
          description: "Task UUID or title."
        }
      }
    }
  },
  {
    name: "organon_task_delete",
    description: "Permanently delete a task by ID or title.",
    parameters: {
      type: "object",
      required: ["idOrTitle"],
      properties: {
        idOrTitle: {
          type: "string",
          description: "Task UUID or title."
        }
      }
    }
  },
  {
    name: "organon_sprint_list",
    description: "List all project sprints and their status.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["all", "planning", "active", "completed", "archived"]
        }
      }
    }
  },
  {
    name: "organon_sprint_create",
    description: "Create a new project sprint.",
    parameters: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Sprint name (e.g. 'Sprint 24 - MVP')" },
        goal: { type: "string", description: "Primary goal of the sprint." },
        startDate: { type: "string", description: "Start date (YYYY-MM-DD)." },
        endDate: { type: "string", description: "End date (YYYY-MM-DD)." },
        projectIds: {
          type: "array",
          items: { type: "string" },
          description: "Associated project IDs."
        }
      }
    }
  },
  {
    name: "organon_note_list",
    description: "List notes stored in Organon with folder and keyword filtering.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search query in note titles." },
        folder: { type: "string", description: "Filter by folder name." }
      }
    }
  },
  {
    name: "organon_note_read",
    description: "Read the markdown content of a note.",
    parameters: {
      type: "object",
      required: ["idOrTitle"],
      properties: {
        idOrTitle: { type: "string", description: "Note ID or title." }
      }
    }
  },
  {
    name: "organon_note_create",
    description: "Create a new markdown note in Organon.",
    parameters: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string", description: "Note title." },
        content: { type: "string", description: "Markdown text content." },
        folder: { type: "string", description: "Target folder name." }
      }
    }
  },
  {
    name: "organon_project_list",
    description: "List all active projects in Organon.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "organon_status",
    description: "Get full system diagnostic status, data locations, storage layout, and summary counts.",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

/**
 * Natural language intent parser for simple AI task prompts
 * e.g. "Add urgent task Review Pull Request #42 tomorrow at 10:00"
 */
function parseNaturalLanguageTask(prompt) {
  const task = {
    title: prompt,
    priority: 'medium',
    date: null,
    time: null,
    durationMinutes: 30,
    tags: []
  };

  let cleaned = prompt;

  // Priority detection
  if (/\b(urgent|urgente|critica|crítica)\b/i.test(cleaned)) {
    task.priority = 'urgent';
    cleaned = cleaned.replace(/\b(urgent|urgente|critica|crítica)\b/gi, '');
  } else if (/\b(high|alta|importante)\b/i.test(cleaned)) {
    task.priority = 'high';
    cleaned = cleaned.replace(/\b(high|alta|importante)\b/gi, '');
  } else if (/\b(low|baixa)\b/i.test(cleaned)) {
    task.priority = 'low';
    cleaned = cleaned.replace(/\b(low|baixa)\b/gi, '');
  }

  // Date detection: today, tomorrow, hoje, amanha
  const today = new Date();
  if (/(?:^|\s)(today|hoje)(?:$|\s)/i.test(cleaned)) {
    task.date = today.toISOString().slice(0, 10);
    cleaned = cleaned.replace(/(?:^|\s)(today|hoje)(?:$|\s)/gi, ' ');
  } else if (/(?:^|\s)(tomorrow|amanh[aã]|amanha)(?:$|\s)/i.test(cleaned)) {
    const tmrw = new Date(today);
    tmrw.setDate(tmrw.getDate() + 1);
    task.date = tmrw.toISOString().slice(0, 10);
    cleaned = cleaned.replace(/(?:^|\s)(tomorrow|amanh[aã]|amanha)(?:$|\s)/gi, ' ');
  } else {
    // YYYY-MM-DD or DD/MM/YYYY
    const dateMatch = cleaned.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) {
      task.date = dateMatch[1];
      cleaned = cleaned.replace(dateMatch[0], '');
    }
  }

  // Time detection: HH:MM or at 10am / às 14h
  const timeMatch = cleaned.match(/(?:at|as|às|as)?\s*(\d{1,2}):(\d{2})/i);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const mins = timeMatch[2];
    task.time = `${hours}:${mins}`;
    cleaned = cleaned.replace(timeMatch[0], '');
  } else {
    const hourOnlyMatch = cleaned.match(/(?:at|as|às)\s*(\d{1,2})\s*(?:h|hrs|am|pm)?/i);
    if (hourOnlyMatch) {
      const hours = hourOnlyMatch[1].padStart(2, '0');
      task.time = `${hours}:00`;
      cleaned = cleaned.replace(hourOnlyMatch[0], '');
    }
  }

  // Clean time and time prepositions & date leftovers
  cleaned = cleaned.replace(/(?:^|\s)(?:at|as|às|a|ao|para)(?:$|\s)/gi, ' ');
  cleaned = cleaned.replace(/(?:^|\s)(today|hoje|tomorrow|amanh[aã]|amanha)(?:$|\s)/gi, ' ');

  // Tags detection: #tag
  const tagMatches = cleaned.match(/#(\w+)/g);
  if (tagMatches) {
    task.tags = tagMatches.map(t => t.replace('#', ''));
    cleaned = cleaned.replace(/#(\w+)/g, '');
  }

  // Clean leading words like "add task", "criar tarefa", "nova tarefa"
  cleaned = cleaned.replace(/^(add\s+task|criar\s+tarefa|nova\s+tarefa|task|tarefa|add|criar)\s+/i, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  task.title = cleaned || prompt;

  return task;
}

module.exports = {
  AI_TOOLS_SCHEMA,
  parseNaturalLanguageTask
};
