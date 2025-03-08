import { Agentify } from "../core/agentify";

async function main() {
  // Initialize the framework
  const app = Agentify({
    logger: true,
  });

  // Define tasks that our workflow will use
  console.log("Defining tasks...");

  // Data retrieval task
  app.task("fetchData", {
    handler: async (input: any) => {
      console.log(`Fetching data for: ${input.query}`);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return mock data
      return {
        results: [
          {
            title: "First result",
            content: "This is the first result for " + input.query,
          },
          {
            title: "Second result",
            content: "This is the second result for " + input.query,
          },
          {
            title: "Third result",
            content: "This is the third result for " + input.query,
          },
        ],
        metadata: {
          source: "mock-api",
          timestamp: new Date().toISOString(),
        },
      };
    },
  });

  // Processing task
  app.task("processData", {
    handler: async (input: any) => {
      console.log(`Processing ${input.results.length} results...`);

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Process each result
      const processedResults = input.results.map((result: any) => {
        return {
          ...result,
          processed: true,
          wordCount: result.content.split(" ").length,
          sentiment: Math.random() > 0.5 ? "positive" : "negative",
        };
      });

      return {
        processedResults,
        processingTime: new Date().toISOString(),
      };
    },
  });

  // Analysis task
  app.task("analyzeData", {
    handler: async (input: any) => {
      console.log(`Analyzing processed data...`);

      // Simulate analysis
      await new Promise((resolve) => setTimeout(resolve, 700));

      // Count sentiments
      const sentiments = input.processedResults.reduce(
        (counts: any, result: any) => {
          counts[result.sentiment] = (counts[result.sentiment] || 0) + 1;
          return counts;
        },
        {}
      );

      // Calculate total word count
      const totalWordCount = input.processedResults.reduce(
        (sum: number, result: any) => sum + result.wordCount,
        0
      );

      return {
        analysis: {
          totalResults: input.processedResults.length,
          sentimentBreakdown: sentiments,
          totalWordCount,
          averageWordCount: totalWordCount / input.processedResults.length,
        },
        timestamp: new Date().toISOString(),
      };
    },
  });

  // Format results task
  app.task("formatResults", {
    handler: async (input: any) => {
      console.log(`Formatting final results...`);

      // Combine all the data
      return {
        summary: {
          query: input.query,
          resultCount: input.analysis.totalResults,
          sentiments: input.analysis.sentimentBreakdown,
          wordCounts: {
            total: input.analysis.totalWordCount,
            average: input.analysis.averageWordCount,
          },
        },
        detailedResults: input.processedResults,
        metadata: {
          processingTime: input.processingTime,
          analysisTime: input.timestamp,
          generatedAt: new Date().toISOString(),
        },
      };
    },
  });

  // Create a sequential workflow
  console.log("Creating sequential workflow...");
  const sequentialWorkflow = app
    .workflow("dataProcessingFlow")
    .description("A sequential workflow to fetch, process, and analyze data")

    // Define the workflow steps
    .task("fetch", {
      taskName: "fetchData",
      // Map input from workflow input to task input
      inputMap: {
        query: "query",
      },
    })
    .task("process", {
      taskName: "processData",
      // Map input from previous step
      inputMap: {
        results: "steps.fetch.results",
      },
    })
    .task("analyze", {
      taskName: "analyzeData",
      // Map input from previous step
      inputMap: {
        processedResults: "steps.process.processedResults",
      },
    })
    .task("format", {
      taskName: "formatResults",
      // Combine inputs from workflow input and previous steps
      inputMap: {
        query: "query",
        analysis: "steps.analyze.analysis",
        processedResults: "steps.process.processedResults",
        processingTime: "steps.process.processingTime",
        timestamp: "steps.analyze.timestamp",
      },
    })

    // Set execution sequence
    .sequence(["fetch", "process", "analyze", "format"]);

  // Create a workflow with a condition
  console.log("Creating conditional workflow...");
  const conditionalWorkflow = app
    .workflow("conditionalProcessing")
    .description("A workflow with conditional processing based on result count")

    // Define the fetch step
    .task("fetch", {
      taskName: "fetchData",
      inputMap: {
        query: "query",
      },
    })

    // Define a condition step
    .condition("checkResultCount", {
      condition: (context: any) => {
        const resultCount = context.steps.fetch.results.length;
        console.log(`Checking result count: ${resultCount}`);
        return resultCount > 2;
      },
      trueNext: "fullProcess",
      falseNext: "simpleProcess",
    })

    // Full processing path
    .task("fullProcess", {
      taskName: "processData",
      inputMap: {
        results: "steps.fetch.results",
      },
    })

    // Simple processing path (just format directly)
    .task("simpleProcess", {
      taskName: "formatResults",
      inputMap: {
        query: "query",
        processedResults: "steps.fetch.results",
        analysis: (context: any) => {
          // Simple inline analysis
          const results = context.steps.fetch.results;
          return {
            totalResults: results.length,
            sentimentBreakdown: { neutral: results.length },
            totalWordCount: results.reduce(
              (sum: number, result: any) =>
                sum + result.content.split(" ").length,
              0
            ),
            averageWordCount:
              results.reduce(
                (sum: number, result: any) =>
                  sum + result.content.split(" ").length,
                0
              ) / results.length,
          };
        },
      },
    })

    // Set execution sequence
    .sequence(["fetch", "checkResultCount"]);

  // Initialize the framework
  await app.ready();
  console.log("Workflows ready!");

  // Execute the sequential workflow
  console.log("\n=== Running Sequential Workflow ===");
  const sequentialResult = await sequentialWorkflow.execute({
    query: "artificial intelligence",
  });

  console.log("\nSequential Workflow Result:");
  console.log(JSON.stringify(sequentialResult.summary, null, 2));

  // Execute the conditional workflow
  console.log("\n=== Running Conditional Workflow ===");
  const conditionalResult = await conditionalWorkflow.execute({
    query: "machine learning",
  });

  console.log("\nConditional Workflow Result:");
  console.log(
    JSON.stringify(conditionalResult.summary || conditionalResult, null, 2)
  );
}

// Run the example
main().catch((error) => {
  console.error("Error in workflow example:", error);
});
