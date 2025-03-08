/**
 * Hooks extend the core functionality of agents, tasks, workflows, and evaluations.
 */

import { Agentify } from "./agentify";

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

export function buildHookSystem(instance: ReturnType<typeof Agentify>) {
  // Initialize hook storage
  instance.hooks = {
    onTaskStart: [],
    onTaskEnd: [],
    onAgentExecute: [],
    onWorkflowStart: [],
    onWorkflowEnd: [],
    onToolUse: [],
    onToolUseComplete: [],
    onToolUseError: [],
    onReady: [],
    onClose: [],
  };

  // Add hook method
  instance.addHook = function (name: string, fn: Function) {
    if (!instance.hooks[name]) {
      instance.hooks[name] = [];
    }
    instance.hooks[name].push(fn);
    return instance;
  };

  // Execute hooks
  instance.executeHook = async function (name: string, ...args: any[]) {
    if (!instance.hooks[name]) {
      return;
    }

    for (const hook of instance.hooks[name]) {
      await hook(...args);
    }
  };
}
