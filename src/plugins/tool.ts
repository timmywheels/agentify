import { AgentifyInstance } from "../core/agentify";
import { z } from "zod";
export type ToolOptions = any;

export interface Tool {
  name: string;
  description: string;
  options: ToolOptions;
  schema: z.ZodSchema;
  execute: (input: any) => Promise<any>;
}

declare module "../core/hooks" {
  interface AgentifyHooks {
    onToolCreate: HookFunction[];
    onToolStart: HookFunction[];
    onToolEnd: HookFunction[];
    onToolError: HookFunction[];
  }
}

declare module "../core/agentify" {
  interface AgentifyInstance {
    _tools: Map<Tool["name"], Tool>;
    tools: {
      create: (tool: Tool, options: ToolOptions) => void;
      list: () => void;
      get: (name: string) => Tool | undefined;
    };
  }
}

export default function (agentify: AgentifyInstance) {
  agentify.decorate("_tools", new Map());

  const create = (tool: Tool, options: ToolOptions) => {
    if (agentify._tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already exists`);
    }

    const obj: Tool = {
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      execute: tool.execute,
      options,
    };
    agentify._tools.set(tool.name, obj);
  };

  const list = () => {
    console.log("Tools:");
    for (const tool of agentify._tools.values()) {
      console.log(`- ${tool.name}`);
    }
  };

  const get = (name: string): Tool | undefined => {
    return agentify._tools.get(name);
  };

  agentify.tools.create = create;
  agentify.tools.list = list;
  agentify.tools.get = get;

  return agentify;
}
