import { AgentifyInstance } from "./agentify";

export interface Model {
  name: string;
  provider: string;
  options: ModelOptions;
  text: (prompt: string) => Promise<string>;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Context {
  messages: Message[];
}

interface ModelOptions {
  model: string;
  apiKey?: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  response_format: {
    type: "text" | "json_object" | "json_schema";
    json_schema?: {
      description: string;
      name: string;
      schema: any;
      strict: boolean;
    };
  };
  parallel_tool_calls: boolean;
  tool_choice:
    | "auto"
    | "none"
    | "required"
    | string
    | { type: string; function: { name: string } };
  default: boolean;
}

declare module "./agentify" {
  interface AgentifyInstance {
    _models: Map<Model["name"], Model>;
    models: {
      create: (model: Model, options: ModelOptions) => void;
      list: () => Model[];
      get: (name: string) => Model | undefined;
      print: () => void;
    };
  }
}

export default function buildModelSystem(agentify: AgentifyInstance) {
  const models = new Map<string, Model>();

  agentify.decorate("_models", models);

  const create = function (model: Model, options: ModelOptions) {
    if (models.has(model.name)) {
      throw new Error(`Provider ${model.name} already exists`);
    }

    const obj: Model = { ...model, options };

    models.set(model.name, obj);
  };

  const list = function () {
    return Array.from(models.values());
  };

  const get = function (name: string) {
    return models.get(name);
  };

  const print = function () {
    if (!models.size) {
      console.log("No models registered");
    } else {
      console.log("Models:");
      for (const model of models.values()) {
        console.log(`- ${model.name}`);
      }
    }
  };

  const text = async function (context: Context, opts: ModelOptions) {
    // TODO: get the provider dynamically
    const model = models.get("openai:gpt-4o");

    if (!model) {
      throw new Error("Model not found");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${
          model.options.apiKey ?? process.env.OPENAI_API_KEY
        }`,
      },
      body: JSON.stringify({
        ...opts,
        model: opts.model,
        messages: context.messages,
      }),
    });

    const data = await response.json();

    return data.choices[0].message.content;
  };

  agentify.decorate("model", {
    name: "gpt-4o",
    text,
    options: {
      temperature: 0.5,
    },
  });

  agentify.decorate("providers", {
    create,
    list,
    get,
    print,
  });

  return agentify;
}
