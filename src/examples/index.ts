import Agentify, { AgentifyInstance } from "../core/agentify";
import agentPlugin from "../plugins/agent";
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

  agentify.register(agentPlugin);
  agentify.register(taskPlugin);
  agentify.register(toolPlugin);

  agentify.register(myOnReadyPlugin);
  agentify.register(myOnStartPlugin);

  await agentify.ready();
  await agentify.start();
}

main();
