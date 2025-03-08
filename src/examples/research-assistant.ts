import { Agentify } from "../core/agentify";
import webSearchPlugin from "../plugins/web-search";
import openaiPlugin from "../plugins/openai";

// Example: Building a simple research assistant

async function main() {
  // Initialize the framework
  const app = Agentify({
    logger: true,
  });

  // Register plugins
  app.register(webSearchPlugin, {
    apiKey: process.env.SEARCH_API_KEY || "demo-key-123",
  });

  app.register(openaiPlugin, {
    apiKey: process.env.OPENAI_API_KEY || "demo-key-456",
  });

  // Define custom tools
  app.tool("extractKeyFacts", {
    description: "Extract key facts from a text passage",
    schema: {
      input: {
        type: "object",
        required: ["text"],
        properties: {
          text: { type: "string" },
          maxFacts: { type: "number", default: 5 },
        },
      },
    },
    use: async (input: { text: string; maxFacts?: number }, context: any) => {
      const { text, maxFacts = 5 } = input;

      // Use OpenAI to extract facts
      const prompt = `Extract up to ${maxFacts} key facts from the following text:\n\n${text}`;
      const result = await context.instance.useTool("openai:completion", {
        prompt,
        model: "gpt-3.5-turbo",
      });

      return result.split("\n").filter((line: string) => line.trim());
    },
  });

  // Define a research agent
  app.agent("researchAgent", {
    capabilities: ["search", "summarize"],
    execute: async (request: any, reply: any) => {
      const { topic } = request.body;

      console.log(`\n📚 Researching topic: "${topic}"`);

      // Step 1: Search for information
      console.log("\n🔍 Searching for information...");
      const searchResults = await request.tools.search.webSearch({
        query: topic,
        limit: 3,
      });

      console.log(`Found ${searchResults.length} results:`);
      searchResults.forEach((result: any, i: number) => {
        console.log(`  ${i + 1}. ${result.title} - ${result.url}`);
      });

      // Step 2: Extract content from each result
      console.log("\n📄 Fetching content from search results...");
      const contents = await Promise.all(
        searchResults.map((result: any) =>
          request.tools.search.fetchContent({ url: result.url })
        )
      );

      // Step 3: Extract key facts from each page
      console.log("\n🔑 Extracting key facts...");
      const allFacts = [];
      for (const content of contents) {
        const facts = await request.tools.extractKeyFacts({
          text: content,
          maxFacts: 3,
        });
        allFacts.push(...facts);
        facts.forEach((fact: string) => console.log(`  • ${fact}`));
      }

      // Step 4: Generate a summary
      console.log("\n📝 Generating summary...");
      const summary = await request.tools.openai.summarize({
        text: allFacts.join("\n"),
        maxLength: 250,
      });

      console.log(`\nSummary: ${summary}`);

      reply.send({
        topic,
        summary,
        keyFacts: allFacts,
        sources: searchResults.map((r: any) => r.url),
      });
    },
  });

  // Define a task that uses the research agent
  app.task("researchTopic", {
    schema: {
      input: {
        type: "object",
        required: ["topic"],
        properties: {
          topic: { type: "string" },
        },
      },
    },
    handler: async (input: { topic: string }, context: any) => {
      return await context.instance.agents.researchAgent.execute(input);
    },
  });

  // Create a simple workflow
  app
    .workflow("topicResearch")
    .description("Research a topic and generate a report")
    .task("researchTopic")
    .task("formatReport", {
      handler: async (input: any, context: any) => {
        // Format the research results into a report
        const { topic, summary, keyFacts, sources } = input;

        return {
          title: `Research Report: ${topic}`,
          summary,
          keyFindings: keyFacts,
          references: sources,
          generatedAt: new Date().toISOString(),
        };
      },
    })
    .sequence(["researchTopic", "formatReport"]);

  // Start the application
  await app.ready();
  console.log("🚀 Research assistant ready!");

  // Execute the workflow
  console.log("\n====== STARTING RESEARCH WORKFLOW ======\n");
  const result = await app.workflows.topicResearch.execute({
    topic: "The impact of artificial intelligence on renewable energy",
  });

  console.log("\n====== FINAL RESEARCH REPORT ======\n");
  console.log(`Title: ${result.title}`);
  console.log(`\nSummary: ${result.summary}`);

  console.log("\nKey Findings:");
  result.keyFindings.forEach((finding: string, i: number) => {
    console.log(`  ${i + 1}. ${finding}`);
  });

  console.log("\nReferences:");
  result.references.forEach((ref: string, i: number) => {
    console.log(`  ${i + 1}. ${ref}`);
  });

  console.log(`\nGenerated: ${new Date(result.generatedAt).toLocaleString()}`);
  console.log("\n====== END OF REPORT ======\n");
}

// Run the example
main().catch(console.error);
