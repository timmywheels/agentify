import { Agentify } from "../core/agentify";

// Define types for agent interfaces
interface AgentRequest {
  body: any;
  tools: Record<string, any>;
  [key: string]: any;
}

interface AgentReply {
  send: (data: any) => void;
  code?: (code: number) => AgentReply;
  [key: string]: any;
}

// Define types for tasks
interface TaskContext {
  instance: ReturnType<typeof Agentify>;
  [key: string]: any;
}

// Define types for workflow context
interface WorkflowContext {
  steps: Record<string, any>;
  [key: string]: any;
}

async function main() {
  // Initialize the framework
  const app = Agentify({
    logger: true,
  });

  // 1. Define Tools for Agents to Use

  // Web search tool
  app.tool("webSearch", {
    description: "Search for information on the web",
    use: async (input: { query: string; limit?: number }) => {
      const { query, limit = 3 } = input;
      console.log(`🔍 Searching web for: "${query}"`);

      // Simulate web search with delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Return mock search results
      return [
        {
          title: `${query} - Wikipedia`,
          snippet: `Comprehensive information about ${query} including history, applications, and recent developments.`,
          url: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, "_")}`,
        },
        {
          title: `Latest advances in ${query}`,
          snippet: `Recent breakthroughs and research directions in the field of ${query}.`,
          url: `https://example.com/research/${query.replace(/\s+/g, "-")}`,
        },
        {
          title: `Learn ${query} - Comprehensive Guide`,
          snippet: `Step-by-step tutorial on understanding and implementing ${query} concepts.`,
          url: `https://example.com/learn/${query.replace(/\s+/g, "-")}`,
        },
      ].slice(0, limit);
    },
  });

  // Content extraction tool
  app.tool("extractContent", {
    description: "Extract content from a URL",
    use: async (input: { url: string }) => {
      const { url } = input;
      console.log(`📄 Extracting content from: ${url}`);

      // Simulate content extraction with delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (url.includes("wikipedia")) {
        return `[Wikipedia Content about ${url
          .split("/")
          .pop()
          ?.replace("_", " ")}]
        This is a comprehensive article covering definition, history, and applications.
        Section 1: Overview and Definition
        Section 2: Historical Development
        Section 3: Modern Applications
        Section 4: Current Research
        Section 5: Future Directions`;
      } else if (url.includes("/research/")) {
        return `[Research Article about ${url
          .split("/")
          .pop()
          ?.replace("-", " ")}]
        Recent breakthroughs have shown significant progress in this field.
        Researchers at leading institutions have developed new techniques.
        These advances have implications for various industries including healthcare and finance.
        Several challenges remain to be solved before widespread adoption.`;
      } else {
        return `[Tutorial Content about ${url
          .split("/")
          .pop()
          ?.replace("-", " ")}]
        This tutorial covers the fundamentals and advanced concepts.
        Step 1: Understanding basic principles
        Step 2: Implementing core algorithms
        Step 3: Optimizing for performance
        Step 4: Real-world applications
        Conclusion: Best practices and next steps`;
      }
    },
  });

  // Text analysis tool
  app.tool("analyzeText", {
    description: "Analyze text for key information",
    use: async (input: { text: string; analysisType?: string }) => {
      const { text, analysisType = "general" } = input;
      console.log(`🔬 Analyzing text (${analysisType} analysis)`);

      // Simulate analysis with delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Extract sentences for analysis
      const sentences = text.split(".").filter((s) => s.trim().length > 0);

      switch (analysisType) {
        case "keypoints":
          // Extract key points (first sentence of each paragraph)
          const paragraphs = text
            .split("\n")
            .filter((p) => p.trim().length > 0);
          return paragraphs.map((p) => {
            const firstSentence = p.split(".")[0].trim();
            return firstSentence.endsWith(".")
              ? firstSentence
              : `${firstSentence}.`;
          });

        case "summary":
          // Generate a mock summary
          return `This content covers the definition, historical context, and applications of the subject matter. It discusses recent developments and potential future directions.`;

        case "entities":
          // Extract mock entities
          return {
            concepts: ["Research", "Development", "Applications", "Techniques"],
            dates: ["Recent", "Current", "Future"],
            organizations: [
              "Universities",
              "Research institutions",
              "Industries",
            ],
          };

        default:
          // General analysis
          return {
            sentenceCount: sentences.length,
            averageSentenceLength:
              sentences.reduce((sum, s) => sum + s.trim().length, 0) /
              sentences.length,
            topKeywords: [
              "research",
              "development",
              "applications",
              "techniques",
              "progress",
            ],
          };
      }
    },
  });

  // Content generation tool
  app.tool("generateContent", {
    description: "Generate content based on input data",
    use: async (input: {
      template: string;
      data: Record<string, any>;
      style?: "formal" | "conversational" | "technical";
    }) => {
      const { template, data, style = "formal" } = input;
      console.log(`✍️ Generating ${style} content`);

      // Simulate content generation with delay
      await new Promise((resolve) => setTimeout(resolve, 700));

      // Simple template processing - replace {{variables}} with data
      let content = template;
      for (const [key, value] of Object.entries(data)) {
        content = content.replace(
          new RegExp(`{{${key}}}`, "g"),
          typeof value === "string" ? value : JSON.stringify(value)
        );
      }

      // Add style-specific flourishes
      switch (style) {
        case "formal":
          content = `${content}\n\nThis information has been carefully curated from authoritative sources.`;
          break;
        case "conversational":
          content = `Hey there! Let me tell you about this:\n\n${content}\n\nPretty cool, right?`;
          break;
        case "technical":
          content = `TECHNICAL REPORT\n\n${content}\n\nReferences: Various technical sources and documentation.`;
          break;
      }

      return content;
    },
  });

  // 2. Define Agents that Use the Tools

  // Research Agent
  app.agent("researchAgent", {
    capabilities: ["search", "extract", "analyze"],
    execute: async (request: AgentRequest, reply: AgentReply) => {
      const topic = request.body?.topic || request.topic;
      const depth = request.body?.depth || request.depth || "basic";

      if (!topic) {
        return reply.send({ error: "No topic provided" });
      }

      console.log(
        `\n🧠 Research Agent working on: "${topic}" (${depth} depth)`
      );

      // Search for information
      const searchResults = await request.tools.webSearch({
        query: topic,
        limit: depth === "deep" ? 3 : 2,
      });

      // Extract content from each result
      const contents = await Promise.all(
        searchResults.map((result: any) =>
          request.tools.extractContent({ url: result.url })
        )
      );

      // Analyze the content
      const analyses = await Promise.all(
        contents.map((content: string) =>
          request.tools.analyzeText({
            text: content,
            analysisType: depth === "deep" ? "keypoints" : "summary",
          })
        )
      );

      // Return the research results
      reply.send({
        topic,
        sources: searchResults.map((r: any) => r.url),
        contents,
        analyses,
        researchDepth: depth,
      });
    },
  });

  // Content Creator Agent
  app.agent("contentCreatorAgent", {
    capabilities: ["analyze", "generate"],
    execute: async (request: AgentRequest, reply: AgentReply) => {
      const research = request.body?.research || request.research;
      const format = request.body?.format || request.format || "report";
      const style = request.body?.style || request.style || "formal";

      if (!research) {
        return reply.send({ error: "No research data provided" });
      }

      console.log(
        `\n📝 Content Creator Agent preparing ${format} in ${style} style`
      );

      // Extract key information from research
      const keyInfo = await request.tools.analyzeText({
        text: research.contents.join("\n\n"),
        analysisType: "entities",
      });

      // Create content template based on format
      let template = "";
      switch (format) {
        case "report":
          template = `# Comprehensive Report on {{topic}}

## Introduction
{{topic}} is a significant area of study with various applications.

## Key Findings
Our research has identified several important concepts including {{concepts}}.
Various {{organizations}} are actively involved in this field.

## Analysis
{{analyses}}

## Conclusion
The field of {{topic}} continues to evolve rapidly with new developments emerging.`;
          break;

        case "summary":
          template = `# {{topic}} - Executive Summary

This brief summary covers the essential aspects of {{topic}}.

The key points from our research include {{analyses}}.

Organizations involved: {{organizations}}.`;
          break;

        case "presentation":
          template = `# {{topic}} - Presentation Slides

Slide 1: Introduction to {{topic}}
- Overview and importance

Slide 2: Key Concepts
- {{concepts}}

Slide 3: Industry Players
- {{organizations}}

Slide 4: Key Insights
- {{analyses}}

Slide 5: Conclusions & Next Steps`;
          break;
      }

      // Generate the content
      const content = await request.tools.generateContent({
        template,
        data: {
          topic: research.topic,
          concepts: keyInfo.concepts.join(", "),
          organizations: keyInfo.organizations.join(", "),
          analyses: Array.isArray(research.analyses)
            ? research.analyses.join("\n\n")
            : JSON.stringify(research.analyses),
        },
        style,
      });

      // Return the generated content
      reply.send({
        topic: research.topic,
        format,
        style,
        content,
        metadata: {
          sourcesUsed: research.sources.length,
          generatedAt: new Date().toISOString(),
        },
      });
    },
  });

  // 3. Define Tasks for Workflow

  // Research task
  app.task("researchTopic", {
    handler: async (input: any, context: TaskContext) => {
      console.log(`\n📚 Starting research task for: ${input.topic}`);

      // Use the research agent - pass inputs directly, not as body
      return await context.instance.agents.researchAgent.execute(input);
    },
  });

  // Content creation task
  app.task("createContent", {
    handler: async (input: any, context: TaskContext) => {
      console.log(
        `\n📄 Starting content creation for: ${input.research.topic}`
      );

      // Use the content creator agent - pass inputs directly, not as body
      return await context.instance.agents.contentCreatorAgent.execute(input);
    },
  });

  // Feedback assessment task
  app.task("assessQuality", {
    handler: async (input: any, context: TaskContext) => {
      console.log(`\n🔍 Assessing content quality`);

      // Simulate assessment with delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Calculate mock metrics
      const contentLength = input.content.content.length;
      const readabilityScore = Math.min(0.9, 0.5 + Math.random() * 0.4);
      const relevanceScore = Math.min(0.95, 0.7 + Math.random() * 0.3);
      const overallScore = (readabilityScore + relevanceScore) / 2;

      return {
        contentMetrics: {
          length: contentLength,
          readabilityScore,
          relevanceScore,
          overallScore,
        },
        feedback:
          overallScore > 0.8
            ? "Excellent content with good coverage of the topic."
            : "Good content but could use more depth in certain areas.",
        passesQualityThreshold: overallScore > 0.7,
      };
    },
  });

  // 4. Define Workflow

  const contentGenerationWorkflow = app
    .workflow("contentGeneration")
    .description("End-to-end workflow to research a topic and create content")

    // Research step
    .task("research", {
      taskName: "researchTopic",
      inputMap: {
        topic: "topic",
        depth: "researchDepth",
      },
    })

    // Content creation step
    .task("create", {
      taskName: "createContent",
      inputMap: {
        research: "steps.research",
        format: "contentFormat",
        style: "contentStyle",
      },
    })

    // Quality assessment step
    .task("assess", {
      taskName: "assessQuality",
      inputMap: {
        content: "steps.create",
      },
    })

    // Conditional step to check quality
    .condition("checkQuality", {
      condition: (context: WorkflowContext) => {
        const assessment = context.steps.assess;
        return assessment.passesQualityThreshold;
      },
      trueNext: "finalize",
      falseNext: "improve",
    })

    // Improvement step (re-create with deeper research)
    .task("improve", {
      taskName: "researchTopic",
      inputMap: {
        topic: "topic",
        depth: () => "deep", // Always use deep research for improvement
      },
    })

    // Re-create content with improved research
    .task("recreate", {
      taskName: "createContent",
      inputMap: {
        research: "steps.improve",
        format: "contentFormat",
        style: "contentStyle",
      },
    })

    // Finalization step
    .task("finalize", {
      taskName: "assessQuality", // Reuse the assessment task for final metrics
      inputMap: {
        content: (context: WorkflowContext) => {
          // Use either the original or improved content
          return context.steps.recreate || context.steps.create;
        },
      },
    })

    // Define execution sequence
    .sequence(["research", "create", "assess", "checkQuality"])

    // Add connections from conditional branches
    // improve -> recreate -> finalize
    .sequence(["improve", "recreate", "finalize"]);

  // Initialize the framework
  await app.ready();
  console.log("Agentic workflow ready!");

  // Execute the workflow
  console.log("\n======= RUNNING AGENTIC WORKFLOW =======\n");

  const workflowResult = await contentGenerationWorkflow.execute({
    topic: "quantum computing",
    researchDepth: "basic",
    contentFormat: "report",
    contentStyle: "technical",
  });

  // Display the results
  console.log("\n======= WORKFLOW RESULTS =======\n");
  if (workflowResult.content) {
    console.log("GENERATED CONTENT:");
    console.log(workflowResult.content);
    console.log("\nQUALITY METRICS:");
    console.log(workflowResult.contentMetrics);
    console.log("\nFEEDBACK:");
    console.log(workflowResult.feedback);
  } else {
    console.log("ERROR: No content was generated");
  }
}

// Run the example
main().catch((error) => {
  console.error("Error in agentic workflow:", error);
});
