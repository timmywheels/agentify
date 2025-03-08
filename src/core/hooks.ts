/**
 * Hooks are a way to extend the core functionality of the agent.
 * They are a way to "hook" into the agent's lifecycle and add custom behavior.

 */

import { Agents } from "./agen";

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

export function buildHookSystem(instance: ReturnType<typeof Agen>) {
  // Initialize hook storage
  instance.hooks = {
    onTaskStart: [],
    onTaskEnd: [],
    onAgentExecute: [],
    onWorkflowStart: [],
    onWorkflowEnd: [],
    onEvaluationStart: [],
    onEvaluationEnd: [],
  };

  // Add hook method
  instance.addHook = function (
    name: keyof Hooks,
    fn: (...args: any[]) => Promise<void>
  ) {
    // Register hook function
    instance.hooks[name].push(fn);
  };

  // Execute hooks
  instance.executeHook = async function (name: keyof Hooks, ...args: any[]) {
    // Run all hooks of a specific type
    for (const hook of instance.hooks[name]) {
      await hook(...args);
    }
  };
}
