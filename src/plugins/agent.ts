import z from "zod";
import { AgentifyInstance } from "../core/agentify";
import { Tool } from "./tool";
import { zodResponseFormat } from "openai/helpers/zod";

declare module "../core/hooks" {
  interface AgentifyHooks {
    onAgentCreate: HookFunction[];
    onAgentReady: HookFunction[];
    onAgentStart: HookFunction[];
    onAgentEnd: HookFunction[];
    onAgentError: HookFunction[];
  }
}

export type AgentOptions = any;

export type AgentContext = Record<string, any>;

export interface Agent {
  name: string;
  description: string;
  tools?: Tool[];
  options?: AgentOptions;
  model?: string;
  execute?: (context: AgentContext) => Promise<any>;
}

declare module "../core/agentify" {
  interface AgentifyInstance {
    _agents: Map<Agent["name"], Agent>;
    agents: {
      create: (agent: Agent, options: AgentOptions) => void;
      list: () => Agent[];
      get: (name: string) => Agent | undefined;
      print: () => void;
    };
  }
}

export default function (agentify: AgentifyInstance) {
  agentify.decorate("_agents", new Map());

  const defaultExecute = (context: AgentContext) => {};

  const create = (agent: Agent, options: AgentOptions) => {
    if (agentify._agents.has(agent.name)) {
      throw new Error(`Agent ${agent.name} already exists`);
    }

    const defaultExecute = async (context: AgentContext) => {
      const _agent = agentify.agents.get(agent.name);

      if (!_agent) {
        throw new Error(`Agent ${agent.name} not found`);
      }

      if (!_agent.execute) {
        throw new Error(`Agent ${agent.name} has no execute function`);
      }

      const tools = _agent.tools ?? [];

      const chat = await agentify.openai.chat.completions.create({
        model: _agent.model ?? "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: _agent.description,
          },
          {
            role: "user",
            content: context.input,
          },
        ],
        response_format: zodResponseFormat(
          z.object({
            result: z.any(),
          }),
          "agent_response"
        ),
        tools: tools.map((tool) => ({
          type: "function",
          function: tool,
        })),
      });

      return chat.choices[0].message.content;
    };

    const obj: Agent = {
      name: agent.name,
      description: agent.description,
      tools: agent.tools,
      options,
      model: agent.model,
      execute: agent.execute ?? defaultExecute,
    };
    agentify._agents.set(agent.name, obj);
  };

  const list = (): Agent[] => {
    return Array.from(agentify._agents.values());
  };

  const get = (name: string): Agent | undefined => {
    return agentify._agents.get(name);
  };

  const print = (): void => {
    if (!agentify._agents.size) {
      console.log("No agents registered");
    } else {
      console.log("Agents:");
      for (const agent of agentify._agents.values()) {
        console.log(`- ${agent.name}`);
      }
    }
  };

  agentify.decorate("agents", {
    create,
    list,
    get,
    print,
  });

  return agentify;
}
