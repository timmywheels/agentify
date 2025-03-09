import { Plugin, RegisterOptions } from "./plugin";
import buildHookSystem from "./hooks";
import buildPluginSystem from "./plugin";

export interface AgentifyInstance {
  options: any;
  decorate: (name: string, value: any) => void;
  register: (plugin: Plugin, opts: RegisterOptions) => AgentifyInstance;
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

  buildPluginSystem(instance);
  buildHookSystem(instance);

  return instance;
}

export { Agentify };
