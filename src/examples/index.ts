import Agentify, { AgentifyInstance } from "../core/agentify";

async function main() {
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

  const agentify = Agentify();

  agentify.register(myOnReadyPlugin);
  agentify.register(myOnStartPlugin);

  await agentify.ready();
  await agentify.start();
}

main();
