import Agentify, { AgentifyInstance } from "../core/agentify";
import agentPlugin, { Agent } from "../plugins/agent";
import taskPlugin from "../plugins/task";
import toolPlugin from "../plugins/tool";

async function main() {
  const agentify = Agentify();

  const myOnReadyPlugin = (agentify: AgentifyInstance) => {
    agentify.addHook("onReady", async () => {
      console.log("Agentify is ready!");
    });
  };

  const myOnStartPlugin = (agentify: AgentifyInstance) => {
    agentify.addHook("onStart", async () => {
      console.log("Agentify is starting...");
    });
  };

  const agent: Agent = {
    name: "My Agent",
    description: "My Agent Description",
    tools: [],
    options: {},
  };

  agentify.register(agentPlugin);
  agentify.register(taskPlugin);
  agentify.register(toolPlugin);

  agentify.agents.create(agent);

  agentify.register(myOnReadyPlugin);
  agentify.register(myOnStartPlugin);

  agentify.listPlugins();
  agentify.tools.print();
  agentify.tasks.print();
  agentify.agents.print();
  agentify.providers.print();

  await agentify.ready();
  await agentify.start();
}

main();
