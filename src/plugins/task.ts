import { AgentifyInstance } from "../core/agentify";

declare module "../core/hooks" {
  interface AgentifyHooks {
    onTaskStart: HookFunction[];
    onTaskEnd: HookFunction[];
    onTaskError: HookFunction[];
  }
}

export type TaskOptions = any;

export interface Task {
  name: string;
  goal: string;
  context?: Record<string, unknown>;
  options?: TaskOptions;
  status?: "pending" | "running" | "completed" | "failed";
  result?: Record<string, unknown>;
  error?: Record<string, unknown>;
  execute?: (opts: Record<string, unknown>) => Promise<void>;
}

declare module "../core/agentify" {
  interface AgentifyInstance {
    _tasks: Map<Task["name"], Task>;
    tasks: {
      create: (task: Task, options: TaskOptions) => void;
      get: (name: string) => Task | undefined;
      list: () => Task[];
      print: () => void;
    };
  }
}

export default function (agentify: AgentifyInstance) {
  agentify.decorate("_tasks", new Map());

  const defaultExecute = async (opts: Record<string, unknown>) => {
    const tools = agentify.tools.list();
    agentify.providers;
  };

  const create = (task: Task, options: TaskOptions) => {
    if (agentify._tasks.has(task.name)) {
      throw new Error(`Task ${task.name} already exists`);
    }

    const obj: Task = {
      name: task.name,
      goal: task.goal,
      execute: task.execute || defaultExecute,
      context: task.context,
      ...options,
    };
    agentify._tasks.set(task.name, obj);
  };

  const list = (): Task[] => {
    return Array.from(agentify._tasks.values());
  };

  const get = (name: string): Task | undefined => {
    return agentify._tasks.get(name);
  };

  const print = (): void => {
    if (!agentify._tasks.size) {
      console.log("No tasks registered");
    } else {
      console.log("Tasks:");
      for (const task of agentify._tasks.values()) {
        console.log(`- ${task.name}`);
      }
    }
  };

  agentify.decorate("tasks", {
    create,
    list,
    get,
    print,
  });

  return agentify;
}
