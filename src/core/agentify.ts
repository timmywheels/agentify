import { buildPluginSystem } from "./plugin";
import { buildHookSystem } from "./hooks";
import { buildTaskSystem } from "./task";
import { buildAgentSystem } from "./agent";
import { buildWorkflowSystem } from "./workflow";
import { buildToolSystem } from "./tool";

export interface PluginInstance {
  name: string;
  init?: () => Promise<void>;
  [key: string]: any;
}

interface Plugins {
  [key: string]: PluginInstance;
}

export interface Agentify {
  tasks: Record<string, any>;
  agents: Record<string, any>;
  workflows: Record<string, any>;
  plugins: Record<string, any>;
  tools: Record<string, any>;
  hooks: Record<string, any>;
  options: any;
  register: (plugin: any, opts: any) => void;
  decorate: (name: string, value: any) => void;
  ready: () => Promise<void>;
  close: () => Promise<void>;
  workflow: (id: string) => any;
  [key: string]: any;
}

interface Hooks {
  onTaskStart: ((task: any) => Promise<void>)[];
  onTaskEnd: ((task: any) => Promise<void>)[];
  onAgentStart: ((agent: any) => Promise<void>)[];
  onAgentEnd: ((agent: any) => Promise<void>)[];
  onWorkflowStart: ((workflow: any) => Promise<void>)[];
  onWorkflowEnd: ((workflow: any) => Promise<void>)[];
  onEvaluationStart: ((evaluation: any) => Promise<void>)[];
  onEvaluationEnd: ((evaluation: any) => Promise<void>)[];
}

export function Agentify(options = {}): Agentify {
  const instance: Agentify = {
    tasks: {},
    agents: {},
    workflows: {},
    plugins: {} as Plugins,
    tools: {},
    hooks: {} as Hooks,
    options,

    // Core methods
    register: (plugin: any, opts: any) => {},
    decorate: (name: string, value: any) => {},
    ready: async () => {},

    // Primitive registration
    task: (name: string, options: any) => {},
    agent: (name: string, options: any) => {},
    workflow: (name: string) => {},
    tool: (name: string, options: any) => {},

    // Hook system
    addHook: (name: string, fn: any) => {},
    executeHook: async (name: string, ...args: any[]) => {},

    // Close/cleanup
    close: async () => {},
  };

  // Initialize all systems
  buildPluginSystem(instance);
  buildHookSystem(instance);
  buildTaskSystem(instance);
  buildAgentSystem(instance);
  buildWorkflowSystem(instance);
  buildToolSystem(instance);

  return instance;
}
