import { Agentify } from "../core/agentify";

async function main() {
  // Initialize the framework
  const app = Agentify({
    logger: true,
  });

  // 1. Define a simple tool
  app.tool("echo", {
    description: "Echo the input",
    use: async (input: any) => {
      console.log(`Tool received: ${JSON.stringify(input)}`);
      return input;
    },
  });

  // 2. Define a simple task
  app.task("processData", {
    handler: async (input: any, context: any) => {
      console.log(`Processing data: ${JSON.stringify(input)}`);

      // Use our tool
      const result = await context.instance.tools.echo.use(input);

      // Add some processing
      return {
        originalInput: result,
        processed: true,
        timestamp: new Date().toISOString(),
      };
    },
  });

  // 3. Define another task
  app.task("formatOutput", {
    handler: async (input: any, context: any) => {
      console.log(`Formatting output: ${JSON.stringify(input)}`);

      return {
        summary: `Processed data from ${input.originalInput.source}`,
        details: input,
        formattedAt: new Date().toISOString(),
      };
    },
  });

  // 4. Define a workflow
  const simpleWorkflow = app
    .workflow("simpleProcess")
    .description("A simple sequential workflow")

    // Define the process step
    .task("process", {
      taskName: "processData",
      // Map workflow input to task input
      inputMap: {
        data: "data",
        source: "source",
      },
    })

    // Define the format step
    .task("format", {
      taskName: "formatOutput",
      // Map previous step output to this task's input
      inputMap: {
        originalInput: "steps.process.originalInput",
        processed: "steps.process.processed",
        timestamp: "steps.process.timestamp",
      },
    })

    // Define the execution sequence
    .sequence(["process", "format"]);

  // Initialize the framework
  await app.ready();
  console.log("Simple workflow ready!");

  // Execute the workflow
  console.log("\n=== EXECUTING SIMPLE WORKFLOW ===\n");

  try {
    const result = await simpleWorkflow.execute({
      data: "Sample data to process",
      source: "user input",
    });

    console.log("\n=== WORKFLOW RESULT ===\n");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Workflow execution error:", error);
  }
}

main().catch(console.error);
