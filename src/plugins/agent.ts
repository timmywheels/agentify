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
  options: AgentOptions;
}

declare module "../core/agentify" {
  interface AgentifyInstance {
    _agents: Map<Agent["name"], Agent>;
    agents: {
      create: (agent: Agent, options: AgentOptions) => void;
      list: () => void;
      get: (name: string) => Agent | undefined;
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

  const list = (): void => {
    console.log("Agents:");
    for (const agent of agentify._agents.values()) {
      console.log(`- ${agent.name}`);
    }
  };

  const get = (name: string): Agent | undefined => {
    return agentify._agents.get(name);
  };

  // add methods to the agentify instance
  agentify.agents.create = create;
  agentify.agents.list = list;
  agentify.agents.get = get;
  return agentify;
}
