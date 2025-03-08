import { Agentify } from "./core/agentify";

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
}

// Run the example with error handling
main().catch((error) => {
  console.error("Error in main:", error);
});
