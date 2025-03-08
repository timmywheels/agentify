import { Agentify } from "../core/agentify";

interface WebSearchOptions {
  apiKey: string;
  defaultEngine?: "google" | "bing" | "duckduckgo";
  maxResults?: number;
}

/**
 * A plugin that adds web search capabilities to the framework
 */
function webSearchPlugin(
  instance: ReturnType<typeof Agentify>,
  opts: WebSearchOptions
) {
  // Validate required options
  if (!opts.apiKey) {
    throw new Error("Web search plugin requires an API key");
  }

  const defaultOptions = {
    defaultEngine: "google",
    maxResults: 10,
    ...opts,
  };

  // Create a namespace for search tools
  const searchTools = instance.toolNamespace("search");

  // Add web search tool
  searchTools.tool("webSearch", {
    description: "Search the web for information on a topic",
    tags: ["search", "web"],
    schema: {
      input: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          engine: {
            type: "string",
            enum: ["google", "bing", "duckduckgo"],
            default: defaultOptions.defaultEngine,
          },
          limit: { type: "number", default: defaultOptions.maxResults },
        },
      },
      output: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            snippet: { type: "string" },
            url: { type: "string" },
          },
        },
      },
    },
    use: async (input: { query: string; engine?: string; limit?: number }) => {
      const { query, engine, limit = defaultOptions.maxResults } = input;

      // Simplified mock implementation
      // In a real implementation, this would call an actual search API
      const mockSearch = async (query: string, limit: number) => {
        console.log(
          `Searching for "${query}" using ${engine} (max results: ${limit})`
        );

        // Mock results
        return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
          title: `Result ${i + 1} for ${query}`,
          snippet: `This is a snippet for result ${
            i + 1
          } related to ${query}...`,
          url: `https://example.com/result-${i + 1}`,
        }));
      };

      return await mockSearch(query, limit);
    },
  });

  // Add content fetching tool
  searchTools.tool("fetchContent", {
    description: "Fetch content from a URL",
    tags: ["web", "content"],
    schema: {
      input: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string" },
        },
      },
    },
    use: async (input: { url: string }) => {
      const { url } = input;

      // Simplified mock implementation
      // In a real implementation, this would fetch and parse web content
      console.log(`Fetching content from ${url}`);

      return `This is simulated content from ${url}. 
      It contains information that would typically be extracted from a webpage.
      The content relates to the topic that was searched for and provides
      useful information that can be processed further.`;
    },
  });

  // Add utility decorator to main instance
  instance.decorate("search", {
    findResults: async (query: string, limit = 5) => {
      return instance.useTool("search:webSearch", { query, limit });
    },
    fetchPageContent: async (url: string) => {
      return instance.useTool("search:fetchContent", { url });
    },
  });

  // Log successful initialization
  instance.log?.info(
    "Web search plugin initialized with API key: " +
      opts.apiKey.substring(0, 3) +
      "..." +
      opts.apiKey.substring(opts.apiKey.length - 3)
  );

  // Return named plugin (for debugging purposes)
  return {
    name: "web-search",
    init: async () => {
      instance.log?.info("Web search plugin ready");
    },
  };
}

// Export the plugin
export default webSearchPlugin;
