import { AgentifyInstance } from "../core/agentify";

declare module "../core/agentify" {
  interface AgentifyInstance {
    onAgentReady: () => Promise<void>;
  }
}

export default function (agentify: AgentifyInstance) {
  agentify.addHook("onReady", async () => {
    console.log("Agentify is ready!");
  });
}
