import { Agentify } from "../core/agentify";
import { TaskDefinition } from "../core/orchestrator";

// Define interfaces for agent parameters
interface AgentRequest {
  body: any;
  tools: Record<string, any>;
}

interface AgentReply {
  send: (data: any) => void;
  code?: (code: number) => AgentReply;
}

async function main() {
  // Initialize the framework
  const app = Agentify({
    logger: true,
  });

  // Define some tools
  app.tool("webSearch", {
    description: "Search for information on the web",
    use: async (input: { query: string }) => {
      console.log(`🔍 Searching for: ${input.query}`);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      return [
        { title: "Search result 1", url: "https://example.com/1" },
        { title: "Search result 2", url: "https://example.com/2" },
      ];
    },
  });

  app.tool("summarize", {
    description: "Summarize a given text",
    use: async (input: { text: string }) => {
      console.log(`📝 Summarizing text (${input.text.length} chars)`);
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate processing
      return `This is a summary of: ${input.text.substring(0, 50)}...`;
    },
  });

  app.tool("generateImage", {
    description: "Generate an image based on a description",
    use: async (input: { prompt: string }) => {
      console.log(`🖼️ Generating image for: ${input.prompt}`);
      await new Promise((resolve) => setTimeout(resolve, 700)); // Simulate API call
      return {
        imageUrl: `https://example.com/images/${encodeURIComponent(
          input.prompt
        )}`,
      };
    },
  });

  // Define agents with different capabilities
  app.agent("researchAgent", {
    capabilities: ["research", "search", "analyze"],
    execute: async (request: AgentRequest, reply: AgentReply) => {
      const { task, goal, query, topic } = request.body;
      // Use topic as query if query is not provided
      const searchQuery = query || topic;

      console.log(
        `🤖 Research Agent working on: ${task} - Query: ${searchQuery}`
      );

      try {
        // Use the search tool
        const searchResults = await request.tools.webSearch.use({
          query: searchQuery,
        });

        // Analyze the results (simplified)
        const analysis = `Analysis of ${searchResults.length} results for query "${searchQuery}"`;

        // Return the response
        reply.send({
          searchResults,
          analysis,
          query: searchQuery,
        });
      } catch (error) {
        console.error("Error in research agent:", error);
        reply.send({
          error: "Failed to complete research",
          query: searchQuery,
        });
      }
    },
  });

  app.agent("creativeAgent", {
    capabilities: ["creative", "generate", "visualize"],
    execute: async (request: AgentRequest, reply: AgentReply) => {
      const { task, goal, concept, topic, visualStyle } = request.body;
      // Use topic as concept if concept is not provided
      const conceptToUse = concept || topic;
      // Get style info if available
      const style = visualStyle || "standard";

      console.log(
        `🤖 Creative Agent working on: ${task} - Concept: ${conceptToUse} (Style: ${style})`
      );

      try {
        // Generate an image based on the concept
        const prompt =
          style !== "standard"
            ? `${conceptToUse} in ${style} style`
            : conceptToUse;
        const imageResult = await request.tools.generateImage.use({ prompt });

        // Return the creative work
        reply.send({
          concept: conceptToUse,
          style,
          imageUrl: imageResult.imageUrl,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error in creative agent:", error);
        reply.send({
          error: "Failed to generate image",
          concept: conceptToUse,
          style,
        });
      }
    },
  });

  app.agent("contentAgent", {
    capabilities: ["summarize", "write", "edit"],
    execute: async (request: AgentRequest, reply: AgentReply) => {
      const { task, goal, content, searchResults, analysis } = request.body;

      // Handle various types of input content
      let contentToProcess = content;
      if (!contentToProcess && searchResults) {
        // If we have search results from a research agent, use those
        contentToProcess =
          JSON.stringify(searchResults) + "\n\n" + (analysis || "");
      }

      console.log(
        `🤖 Content Agent working on: ${task} - Content length: ${
          contentToProcess?.length || 0
        }`
      );

      try {
        // Summarize the content if provided
        let summary = "";
        if (contentToProcess) {
          summary = await request.tools.summarize.use({
            text: contentToProcess,
          });
        } else {
          summary = "No content provided to summarize.";
        }

        // Return the processed content
        reply.send({
          originalLength: contentToProcess?.length || 0,
          summary,
          processedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error in content agent:", error);
        reply.send({
          error: "Failed to process content",
          contentLength: contentToProcess?.length || 0,
        });
      }
    },
  });

  // Initialize the framework
  await app.ready();
  console.log("Framework ready!");

  // ----------------------------------------
  // 🎯 Define our task declaratively
  // ----------------------------------------

  // This is the only part the developer needs to write!
  const researchAndVisualize: TaskDefinition = {
    name: "researchAndVisualize",
    description: "Research a topic and create a visual representation",
    goal: "Provide both textual and visual information about a given topic",

    // Define the inputs our task expects
    input: {
      topic: "string",
      visualStyle: "string?", // Optional
    },

    // What capabilities we need (the orchestrator will find appropriate agents)
    requiredCapabilities: ["research", "summarize", "visualize"],

    // Define evaluation criteria
    evaluationCriteria: {
      relevance: {
        description: "How relevant the research results are to the topic",
        threshold: 0.7,
      },
      quality: {
        description: "The quality of the visual representation",
        threshold: 0.6,
      },
    },

    // How many attempts the system should make if evaluation fails
    maxAttempts: 2,
  };

  console.log("\n=== EXECUTING DECLARATIVE TASK ===\n");

  // Execute the task with just the necessary input
  try {
    const result = await app.run(researchAndVisualize, {
      topic: "Quantum computing",
      visualStyle: "futuristic",
    });

    console.log("\n=== TASK RESULT ===\n");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Task execution failed:", error);
  }

  // ----------------------------------------
  // 🎯 Alternative approach: define reusable tasks
  // ----------------------------------------

  // Define once, use multiple times
  const analyzeNews = app.defineTask({
    name: "analyzeNews",
    description: "Analyze recent news on a topic",
    goal: "Provide a comprehensive analysis of recent developments",
    requiredCapabilities: ["research", "analyze", "summarize"],
    input: {
      topic: "string",
      timeframe: "string?", // Optional
    },
  });

  // Now you can use it whenever needed
  try {
    const techNews = await analyzeNews({
      topic: "artificial intelligence",
      timeframe: "last week",
    });

    const cryptoNews = await analyzeNews({
      topic: "cryptocurrency",
      timeframe: "last month",
    });

    console.log("\n=== NEWS ANALYSIS RESULTS ===\n");
    console.log("AI News Summary:", techNews.summary);
    console.log("Crypto News Summary:", cryptoNews.summary);
  } catch (error) {
    console.error("News analysis failed:", error);
  }
}

main().catch(console.error);
