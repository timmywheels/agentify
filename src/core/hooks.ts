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
  // Use Record<string, HookFunction[]> to allow for dynamic properties
  const hooks: Record<string, HookFunction[]> = {
    onStart: [],
    onReady: [],
    onClose: [],
    onError: [],
  };

  // Assign hooks to the instance
  agentify.hooks = hooks as AgentifyHooks;

  // Add hook method
  agentify.addHook = function (name: string, fn: Function) {
    if (typeof fn === "function") {
      // Initialize the hook array if it doesn't exist yet
      if (!agentify.hooks![name]) {
        console.log(`Initializing hook: ${name}`);
        agentify.hooks![name] = [];
      }

      console.log(`Adding hook: ${name}`);
      agentify.hooks![name].push(fn as HookFunction);
    }
    return agentify;
  };

  // Execute hooks
  agentify.executeHook = async function (name: string, ...args: any[]) {
    // Check if the hook exists
    if (!agentify.hooks![name] || agentify.hooks![name].length === 0) {
      console.log(`No hooks found for: ${name}`);
      return;
    }

    console.log(`Executing hooks for: ${name}`);
    for (const hook of agentify.hooks![name]) {
      await hook(...args);
    }
  };

  return agentify;
}
