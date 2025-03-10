import z from "zod";
import { AgentifyInstance } from "../core/agentify";
import { Tool } from "./tool";
import { zodResponseFormat } from "openai/helpers/zod";
import { Task } from "./task";
import { openai } from "@ai-sdk/openai";
import { LanguageModelV1 } from "ai";
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
  do?: (task: Task, context?: AgentContext) => Promise<any>;
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
    if (agentify._agents.get(agent.name)) {
      throw new Error(`Agent ${agent.name} already exists`);
    }

    console.log("agent___:", agent);

    const doTask = async (task: Task, context: AgentContext = {}) => {
      const _agent = agentify.agents.get(agent.name);

      if (!_agent) {
        throw new Error(`Agent ${agent.name} not found`);
      }

      const tools = _agent.tools ?? [];

      const model = _agent.model ?? openai("gpt-4o-mini");

      const chat = await model.doGenerate({
        inputFormat: "prompt",
        mode: {
          type: "regular",
          tools: tools.map((tool) => {
            return {
              type: "function",
              name: tool.name,
              description: tool.description,
              parameters: zodToJsonSchema(tool.parameters) as JSONSchema7,
            };
          }),
        },
        prompt: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  typeof task.goal === "string"
                    ? task.goal
                    : JSON.stringify(task.goal),
              },
            ],
          },
        ],
      });

      const text = chat.text;
      const toolCalls = chat.toolCalls;

      console.log("toolCalls:", toolCalls);

      if (toolCalls?.length) {
        const toolCall = toolCalls[0];
        const tool = tools.find(
          (t) => t.name.replace(/[^a-zA-Z0-9_-]/g, "_") === toolCall.toolName
        );
        if (tool) {
          const parsedArgs = JSON.parse(toolCall.args);
          console.log("parsed_args:", parsedArgs);
          return tool.execute(parsedArgs);
        }
      }

      console.log("text:", text);
      return text;
    };

    console.log("primitive, agent.do:", agent.do);
    console.log("primitive, doTask:", doTask);
    console.log("primitive, agentify.agents:", agent.do ?? doTask);

    if (!agent.do) {
      agent.do = doTask;
    }
    agent.options = options;
    agentify._agents.set(agent.name, agent);
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
