import { AgentifyInstance } from "../../core/agentify";
import Anthropic from "@anthropic-ai/sdk";
import { RegisterOptions } from "../../core/plugins";

declare module "../../core/agentify" {
  interface AgentifyInstance {
    anthropic: Anthropic;
  }
}

export default function anthropic(
  agentify: AgentifyInstance,
  opts: RegisterOptions
) {
  const client = new Anthropic({
    apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY,
  });

  agentify.decorate("anthropic", client);
}
