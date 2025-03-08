import { Agentify } from "./core/agentify";

// Initialize the framework
const app = Agentify({
  logger: true,
});

// Just try to register a simple tool
console.log("Registering tool...");
try {
  app.tool("simpleEcho", {
    description: "Simple echo tool",
    use: async (input: any) => {
      console.log("Echo tool called with:", input);
      return input;
    },
  });
  console.log("Tool registered successfully!");
} catch (error) {
  console.error("Error registering tool:", error);
}

// Print what app.tool is
console.log("app.tool is:", typeof app.tool);
console.log("app.tools is:", app.tools);

// Try calling the tool
console.log("Trying to use the tool...");
try {
  app.ready().then(() => {
    app.tools.simpleEcho
      .use({ message: "Hello World!" })
      .then((result: any) => {
        console.log("Tool result:", result);
      });
  });
} catch (error) {
  console.error("Error using tool:", error);
}
