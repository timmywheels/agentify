import { Agentify } from "./core/agentify";

// Initialize the framework
const app = Agentify({
  logger: true,
});

// Only register a simple tool
console.log("Registering simple tool...");
try {
  app.tool("simpleEcho", {
    description: "Simple echo tool",
    use: async (input: any) => {
      console.log("Echo called with:", input);
      return input;
    },
  });
  console.log("Tool registered successfully!");
} catch (error) {
  console.error("Error registering tool:", error);
}

// Print app structure to debug
console.log("app.tool type:", typeof app.tool);
console.log("app.tools:", app.tools);

// Start the application
app.ready().then(() => {
  console.log("Application ready!");

  // Try to use the tool directly
  console.log("Using tool...");
  app.tools.simpleEcho
    .use({ message: "Hello, agen-ts!" })
    .then((result: any) => {
      console.log("Tool result:", result);
    })
    .catch((error: any) => {
      console.error("Error using tool:", error);
    });
});
