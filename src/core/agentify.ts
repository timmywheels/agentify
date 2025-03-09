import { Plugin, RegisterOptions } from "./plugins";
import buildHookSystem, { AgentifyHooks } from "./hooks";
import buildPluginSystem from "./plugins";

export interface AgentifyInstance {
  options: any;
  decorate: (name: string, value: any) => void;
  register: (plugin: Plugin, opts?: RegisterOptions) => AgentifyInstance;
  hooks: AgentifyHooks;
  addHook: (name: string, fn: Function) => AgentifyInstance;
  executeHook: (name: string, ...args: any[]) => Promise<void>;
  [key: string]: any;
}

export default function Agentify(options = {}) {
  // Use any type to allow string indexing
  const instance: any = {
    options,
    decorate: (name: string, value: any) => {},
    register: (plugin: Plugin, opts: RegisterOptions = {}) => {
      // This is just a placeholder - the actual implementation will be provided by buildPluginSystem
      return instance;
    },
  };

  const decorate = (name: string, value: any) => {
    if (instance[name]) {
      throw new Error(`Decorator ${name} already exists`);
    }
    instance[name] = value;
  };

  instance.decorate = decorate;

  // initialize coresystems
  buildPluginSystem(instance);
  buildHookSystem(instance);

  return instance;
}

export { Agentify };
