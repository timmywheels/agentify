import { AgentifyInstance } from "../core/agentify";
import { Tool } from "./tool";
import { openai } from "@ai-sdk/openai";
import { generateText, LanguageModelV1 } from "ai";
import zodToJsonSchema from "zod-to-json-schema";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { JSONSchema7 } from "json-schema";

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
  model?: LanguageModelV1;
  do?: (instructions: string, context?: AgentContext) => Promise<any>;
}

declare module "../core/agentify" {
  interface AgentifyInstance {
    _agents: Map<Agent["name"], Agent>;
    agents: {
      create: (agent: Agent, options: AgentOptions) => Agent;
      list: () => Agent[];
      get: (name: string) => Agent | undefined;
      print: () => void;
    };
  }
}

export default function (agentify: AgentifyInstance) {
  agentify.decorate("_agents", new Map());

  const create = (agent: Agent, options: AgentOptions) => {
    if (agentify._agents.get(agent.name)) {
      throw new Error(`Agent ${agent.name} already exists`);
    }

    const buildToolMap = (tools: Tool[]) => {
      const toolMap: Record<string, Tool> = {};
      tools.forEach((tool) => {
        toolMap[tool.name] = tool;
      });
      return toolMap;
    };

    const doTask = async (instructions: string, context: AgentContext = {}) => {
      const _agent = agentify.agents.get(agent.name);

      if (!_agent) {
        throw new Error(`Agent ${agent.name} not found`);
      }

      const tools = _agent.tools ?? [];
      const model = _agent.model ?? openai("gpt-4o-mini");

      const data = await generateText({
        model,
        messages: [
          {
            role: "system",
            content: `You are a(n): ${agent.name}. Your goal is: ${
              agent.description
            }. ${
              tools.length
                ? `You have access to the following tools: ${tools
                    .map((tool) => `${tool.name}: ${tool.description}`)
                    .join(", ")}.`
                : ""
            }`,
          },
          {
            role: "user",
            content: instructions,
          },
        ],
        maxSteps: 10,
        tools: buildToolMap(tools),
      });

      const toolResponses = data?.toolCalls?.map(async (toolCall) => {
        const tool = tools.find((t) => t.name === toolCall.toolName);
        if (tool) {
          const parsedArgs = JSON.parse(toolCall.args);
          console.log("parsed_args:", parsedArgs);
          const response = await tool.execute(parsedArgs);
          console.log("tool_response:", response);
          return response;
        }
      });

      const steps = data.steps?.map((step: any, index: number) => {
        console.log(`Step ${index}:`, step.stepType);
        for (const msg of step.response.messages) {
          console.log(`Message ${msg.role}:`, msg.content);
        }
        return step;
      });

      //   console.log(steps);

      if (toolResponses?.length) {
        return toolResponses;
      }

      //   console.log("text:", text);
      return data.text;
    };

    if (!agent.do) {
      agent.do = doTask;
    }
    agent.options = options;
    agentify._agents.set(agent.name, agent);
    return agent;
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
