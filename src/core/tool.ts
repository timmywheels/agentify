import { Agentify } from "./agentify";

// Define tool interfaces
interface ToolOptions<TInput = any, TOutput = any> {
  description: string;
  use: (input: TInput, context: ToolContext) => Promise<TOutput> | TOutput;
  schema?: {
    input?: any;
    output?: any;
  };
  tags?: string[];
}

interface ToolContext {
  instance: ReturnType<typeof Agentify>;
  agent?: any;
  task?: any;
  log?: any;
  [key: string]: any;
}

interface ToolInstance<TInput = any, TOutput = any> {
  name: string;
  description: string;
  use: (input: TInput, context?: ToolContext) => Promise<TOutput> | TOutput;
  schema?: {
    input?: any;
    output?: any;
  };
  tags: string[];
  [key: string]: any;
}

export function buildToolSystem(instance: ReturnType<typeof Agentify>) {
  // Tool storage
  instance.tools = {} as Record<string, ToolInstance>;

  // Tool registration
  instance.tool = function <TInput = any, TOutput = any>(
    name: string,
    options: ToolOptions<TInput, TOutput>
  ) {
    if (instance.tools[name]) {
      throw new Error(`Tool ${name} already registered`);
    }

    // Create tool instance
    const tool: ToolInstance<TInput, TOutput> = {
      name,
      description: options.description,
      schema: options.schema,
      tags: options.tags || [],

      // Main execution method
      use: async (input: TInput, context: ToolContext = { instance }) => {
        // Run pre-execution hooks
        await instance.executeHook("onToolUse", tool, input, context);

        try {
          // Validate input if schema exists
          if (tool.schema?.input && instance.validate) {
            const valid = instance.validate(input, tool.schema.input);
            if (!valid) {
              throw new Error(`Input validation failed for tool ${name}`);
            }
          }

          // Execute the tool
          const result = await options.use(input, {
            ...context,
            instance,
            log: context.log || instance.log?.child({ tool: name }),
          });

          // Validate output if schema exists
          if (tool.schema?.output && instance.validate) {
            const valid = instance.validate(result, tool.schema.output);
            if (!valid) {
              throw new Error(`Output validation failed for tool ${name}`);
            }
          }

          // Run post-execution hooks
          await instance.executeHook(
            "onToolUseComplete",
            tool,
            input,
            result,
            context
          );

          return result;
        } catch (error) {
          // Run error hooks
          await instance.executeHook(
            "onToolUseError",
            tool,
            input,
            error,
            context
          );
          throw error;
        }
      },
    };

    // Store tool instance
    instance.tools[name] = tool;

    // Run registration hooks
    instance.executeHook("onToolRegister", tool);

    return tool;
  };

  // Tool decorator
  instance.decorateTool = function (name: string, fn: Function) {
    // Add method to all tool prototypes
    for (const toolName in instance.tools) {
      const tool = instance.tools[toolName];
      tool[name] = fn(tool);
    }

    // Add to future tools
    instance.addHook("onToolRegister", (tool: ToolInstance) => {
      tool[name] = fn(tool);
    });

    return instance;
  };

  // Helper to get a tool by name
  instance.getTool = function (name: string) {
    return instance.tools[name];
  };

  // Helper to find tools by tag
  instance.findToolsByTag = function (tag: string) {
    return Object.values(instance.tools as Record<string, ToolInstance>).filter(
      (tool) => tool.tags.includes(tag)
    );
  };

  // Create a namespace for related tools
  instance.toolNamespace = function (namespace: string) {
    const namespacedTools: Record<string, any> = {};

    // Interface for adding tools to this namespace
    const toolContainer = {
      tool: function <TInput = any, TOutput = any>(
        name: string,
        options: ToolOptions<TInput, TOutput>
      ) {
        const fullName = `${namespace}:${name}`;
        const tool = instance.tool(fullName, options);

        // Add to namespace object for easier access
        namespacedTools[name] = tool;

        return tool;
      },

      // Get all tools in this namespace
      getTools: () => namespacedTools,
    };

    return toolContainer;
  };

  // Helper to attach tools to an agent
  instance.attachTools = function (agentName: string, toolNames: string[]) {
    const agent = instance.agents[agentName];
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    // Create or update agent's tools property
    agent.tools = agent.tools || {};

    // Attach each tool
    for (const toolName of toolNames) {
      const tool = instance.tools[toolName];
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      // Add tool to agent's tools
      agent.tools[toolName] = tool;
    }

    return agent;
  };

  // Method to use a tool directly
  instance.useTool = async function <TInput = any, TOutput = any>(
    name: string,
    input: TInput,
    context?: ToolContext
  ) {
    const tool = instance.tools[name] as ToolInstance<TInput, TOutput>;
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    return await tool.use(input, context || { instance });
  };

  // Register the tool hooks
  if (instance.addHook) {
    instance.addHook(
      "onAgentExecute",
      async (agent: any, task: any, input: any, context: any) => {
        // Make tools available in the agent context
        if (agent.tools) {
          context.tools = Object.entries(agent.tools).reduce(
            (acc, [name, tool]) => {
              acc[name] = (input: any) =>
                (tool as ToolInstance).use(input, {
                  ...context,
                  agent,
                  task,
                });
              return acc;
            },
            {} as Record<string, any>
          );
        }
      }
    );
  }
}
