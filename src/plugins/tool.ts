import { JSONSchema7 } from "json-schema";
import { AgentifyInstance } from "../core/agentify";
import { z } from "zod";
export type ToolOptions = {
  type: "function";
  strict?: boolean;
  register?: boolean;
};

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  options?: ToolOptions;
  execute: (args: any) => Promise<any>;
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
      create: (tool: Tool, options: ToolOptions) => Tool;
      list: () => Tool[];
      get: (name: string) => Tool | undefined;
      print: () => void;
    };
  }
}

export default function (agentify: AgentifyInstance) {
  agentify.decorate("_tools", new Map());

  const create = (tool: Tool, opts: ToolOptions): Tool => {
    if (agentify._tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already exists`);
    }

    tool.options = opts;
    agentify._tools.set(tool.name, tool);
    return tool;
  };

  const list = (): Tool[] => {
    return Array.from(agentify._tools.values());
  };

  const get = (name: string): Tool | undefined => {
    return agentify._tools.get(name);
  };

  const print = (): void => {
    if (!agentify._tools.size) {
      console.log("No tools registered");
    } else {
      console.log("Tools:");
      for (const tool of agentify._tools.values()) {
        console.log(`- ${tool.name}`);
      }
    }
  };

  agentify.decorate("tools", {
    create,
    list,
    get,
    print,
  });

  return agentify;
}
