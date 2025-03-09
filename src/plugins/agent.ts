import { AgentifyInstance } from "../core/agentify";
import { Tool } from "./tool";

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

export interface Agent {
  name: string;
  description: string;
  tools?: Tool[];
  options?: AgentOptions;
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

  const create = (agent: Agent, options: AgentOptions) => {
    if (agentify._agents.has(agent.name)) {
      throw new Error(`Agent ${agent.name} already exists`);
    }

    const obj: Agent = {
      name: agent.name,
      description: agent.description,
      tools: agent.tools,
      options,
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
