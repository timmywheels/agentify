interface PluginInstance {
  name: string;
  [key: string]: any;
}

interface Plugins {
  [key: string]: PluginInstance;
}

interface Agents {
  tasks: Record<string, any>;
  agents: Record<string, any>;
  workflows: Record<string, any>;
  plugins: Record<string, any>;
  hooks: Record<string, any>;
  options: any;
  register: (plugin: any, opts: any) => void;
  decorate: (name: string, value: any) => void;
  ready: () => Promise<void>;
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

export function Agents(options = {}) {
  const instance: Agents = {
    tasks: {},
    agents: {},
    workflows: {},
    plugins: {} as Plugins,
    hooks: {} as Hooks,
    options,

    // Core methods
    register: (plugin: PluginInstance, opts: any) => {},
    decorate: (name: string, value: any) => {},
    ready: async () => {},

    // Primitive registration
    task: (name: string, options: any) => {},
    agent: (name: string, options: any) => {},
    workflow: (name: string) => {},

    // Hook system
    addHook: (name: string, fn: any) => {},

    // Close/cleanup
    close: async () => {},
  };

  return instance;
}
