/**
 * Hooks extend the core functionality of agents, tasks, workflows, and evaluations.
 */

import { AgentifyInstance } from "./agentify";

export type LifecycleHook = "onReady" | "onStart" | "onClose" | "onError";
export type HookFunction = (...args: any[]) => Promise<void>;

// No need to redeclare the interface properties since they already exist in agentify.ts
// The implementation will still use the more specific types

export default (agentify: AgentifyInstance) => {
  // Initialize hook storage
  agentify.hooks = {
    onStart: [],
    onReady: [],
    onClose: [],
    onError: [],
  };

  // Add hook method
  agentify.addHook = function (name: string, fn: Function) {
    if ((name as LifecycleHook) && typeof fn === "function") {
      if (!agentify.hooks[name]) {
        console.log(`Adding hook: ${name}`);
        agentify.hooks[name] = [];
      }
      agentify.hooks[name].push(fn);
    }
    return agentify;
  };

  // Execute hooks
  agentify.executeHook = async function (name: string, ...args: any[]) {
    if (!agentify.hooks[name]) {
      return;
    }

    console.log(`Executing hooks for: ${name}`);
    for (const hook of agentify.hooks[name]) {
      await hook(...args);
    }
  };
};
