import OpenAI from "openai";
import { AgentifyInstance } from "../../core/agentify";
import { RegisterOptions } from "../../core/plugins";

declare module "../../core/agentify" {
  interface AgentifyInstance {
    openai: OpenAI;
  }
}

export default function openai(
  agentify: AgentifyInstance,
  opts: RegisterOptions
) {
  const client = new OpenAI({
    apiKey: opts.apiKey ?? process.env.OPENAI_API_KEY,
  });
  agentify.decorate("openai", client);
}
