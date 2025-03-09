/**
 * Hooks extend the core functionality of agents, tasks, workflows, and evaluations.
 */

import { AgentifyInstance } from "./agentify";

export type LifecycleHook = "onReady" | "onStart" | "onClose" | "onError";
export type HookFunction = (...args: any[]) => Promise<void>;

// Base hooks interface with index signature to allow for augmentation
export interface AgentifyHooks {
  onStart: HookFunction[];
  onReady: HookFunction[];
  onClose: HookFunction[];
  onError: HookFunction[];
  [key: string]: HookFunction[];
}

export default function buildHookSystem(agentify: AgentifyInstance) {
  // Initialize hook storage with base hooks
  const hooks = new Map<string, HookFunction[]>();
  hooks.set("onStart", []);
  hooks.set("onReady", []);
  hooks.set("onClose", []);
  hooks.set("onError", []);

  // Assign hooks to the instance
  agentify.decorate("hooks", hooks);

  // Add hook method
  const addHook = function (name: string, fn: Function) {
    if (typeof fn === "function") {
      // Initialize the hook array if it doesn't exist yet
      if (!agentify.hooks![name]) {
        agentify.hooks[name] = [];
      }

      agentify.hooks![name].push(fn as HookFunction);
    }
    return agentify;
  };

  // Execute hooks
  const executeHook = async function (name: string, ...args: any[]) {
    // Check if the hook exists
    if (!agentify.hooks![name] || agentify.hooks![name].length === 0) {
      return;
    }

    for (const hook of agentify.hooks![name]) {
      await hook(...args);
    }
  };

  agentify.decorate("addHook", addHook);
  agentify.decorate("executeHook", executeHook);

  return agentify;
}
