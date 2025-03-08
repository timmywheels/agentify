import { Agentify } from "../core/agentify";
import { TaskDefinition } from "../core/orchestrator";

// Define simplified interfaces for agent parameters
interface AgentRequest {
  body: any;
  tools: Record<string, any>;
}

interface AgentReply {
  send: (data: any) => void;
}

async function main() {
  // Initialize the framework with verbose logging
  const app = Agentify({
    logger: true,
  });

  // Define a simple echo tool
  app.tool("echo", {
    description: "Echo the input",
    use: async (input: any) => {
      console.log(`Echo tool received:`, input);
      return input;
    },
  });

  // Define a simple agent
  app.agent("echoAgent", {
    capabilities: ["echo"],
    execute: async (request: AgentRequest, reply: AgentReply) => {
      console.log("Echo agent execution started");

      // Safely print request info without circular references
      console.log(
        "Echo agent body:",
        request.body
          ? `{ message: "${request.body.message || "none"}" }`
          : "undefined"
      );
      console.log(
        "Echo agent tools available:",
        request.tools ? Object.keys(request.tools) : "none"
      );

      // Use the echo tool
      const message = request.body?.message || "No message provided";
      console.log(`Echo agent using message: "${message}"`);

      try {
        if (!request.tools || !request.tools.echo) {
          throw new Error("Echo tool not available");
        }

        const result = await request.tools.echo.use({
          message: message,
        });

        console.log("Echo tool result:", result);

        // Send the response
        reply.send({
          result,
          processed: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error using echo tool:", error);
        reply.send({
          error: "Failed to process message",
          message: message,
        });
      }
    },
  });

  // Initialize the framework
  await app.ready();
  console.log("Framework ready!");

  // Define a simple task
  const echoTask: TaskDefinition = {
    name: "echoTask",
    description: "Simply echo a message back",
    goal: "Test the orchestrator with a simple echo",

    // Define the input
    input: {
      message: "string",
    },

    // Required capabilities
    requiredCapabilities: ["echo"],
  };

  console.log("\n=== EXECUTING SIMPLE ECHO TASK ===\n");

  // Execute the task
  try {
    const result = await app.run(echoTask, {
      message: "Hello, Orchestrator!",
    });

    console.log("\n=== TASK RESULT ===\n");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Task execution failed:", error);
  }
}

main().catch(console.error);
