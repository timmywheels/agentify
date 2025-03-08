import { Agentify } from "./core/agentify";
export { Agentify } from "./core/agentify";
export { TaskDefinition, DecompositionStrategy } from "./core/orchestrator";

declare module "./core/agentify" {
  interface AgentifyInstance {
    tools: {
      simpleEcho: {
        use: (input: any) => Promise<any>;
      };
    };

    // Add orchestrator to the type declaration
    orchestrator: any;
    run: (taskDefinition: any, input?: any) => Promise<any>;
    defineTask: (taskDefinition: any) => (input?: any) => Promise<any>;
  }
}

// Example of how to use the framework
async function main() {
  // Initialize the framework
  const app = Agentify({
    logger: true,
  });

  // Only register a simple tool
  console.log("Registering simple tool...");
  app.tool("simpleEcho", {
    description: "Simple echo tool",
    use: async (input: any) => {
      console.log("Echo called with:", input);
      return input;
    },
  });

  // Start the application
  await app.ready();
  console.log("Application ready!");

  // Try to use the tool directly
  console.log("Using tool...");
  const result = await app.tools.simpleEcho.use({ message: "Hello, agen-ts!" });
  console.log("Tool result:", result);

  // You can also use the new declarative task API
  console.log("\nTry running a declarative task:");
  console.log("const myTask = app.defineTask({");
  console.log("  name: 'myTask',");
  console.log("  description: 'Description of what the task does',");
  console.log("  goal: 'The goal this task should achieve',");
  console.log("  requiredCapabilities: ['capability1', 'capability2'],");
  console.log("});");
  console.log("const result = await myTask(input);");
}

// Run the example with error handling
main().catch((error) => {
  console.error("Error in main:", error);
});
