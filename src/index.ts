async function main() {
  const agent = new EchoAgent();

  if (agent.init) {
    await agent.init();
  }

  agent.execute({ data: "Hello, agen-ts!" });

  if (agent.shutdown) {
    await agent.shutdown();
  }
}

main();
