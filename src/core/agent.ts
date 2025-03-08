import { Agentify } from "./agentify";

// Define agent interfaces
interface AgentOptions {
  capabilities?: string[];
  execute: (request: AgentRequest, reply: AgentReply) => Promise<void>;
  init?: () => Promise<void>;
  shutdown?: () => Promise<void>;
  description?: string;
}

interface AgentRequest {
  task: { name: string; [key: string]: any };
  body: any;
  params?: Record<string, any>;
  tools?: Record<string, any>;
  log?: any;
  [key: string]: any;
}

interface AgentReply {
  send: (data: any) => void;
  error: (err: Error) => void;
  code: (statusCode: number) => AgentReply;
  [key: string]: any;
}

interface AgentInstance {
  name: string;
  capabilities: string[];
  execute: (task: any, input: any, context?: any) => Promise<any>;
  init?: () => Promise<void>;
  shutdown?: () => Promise<void>;
  description?: string;
  [key: string]: any;
}

export function buildAgentSystem(instance: ReturnType<typeof Agentify>) {
  // Agent storage
  instance.agents = {} as Record<string, AgentInstance>;

  // Agent registration
  instance.agent = function (name: string, options: AgentOptions) {
    if (instance.agents[name]) {
      throw new Error(`Agent ${name} already registered`);
    }

    // Create agent instance
    const agent: AgentInstance = {
      name,
      capabilities: options.capabilities || [],
      description: options.description,
      init: options.init,
      shutdown: options.shutdown,

      // Core execution method
      execute: async (task: any, input: any, context: any = {}) => {
        // Create request/reply objects
        const request = buildAgentRequest(task, input, context);
        let response: any = null;
        let error: Error | null = null;

        const reply = buildAgentReply({
          send: (data: any) => {
            response = data;
          },
          error: (err: Error) => {
            error = err;
          },
        });

        // Run pre-execution hooks
        await instance.executeHook(
          "onAgentExecute",
          agent,
          task,
          input,
          context
        );

        try {
          // Execute the agent
          await options.execute(request, reply);

          // Run post-execution hooks
          await instance.executeHook(
            "onAgentExecuteComplete",
            agent,
            task,
            input,
            response,
            context
          );

          // Handle errors
          if (error) throw error;

          return response;
        } catch (err) {
          // Run error hooks
          await instance.executeHook(
            "onAgentExecuteError",
            agent,
            task,
            input,
            err,
            context
          );
          throw err;
        }
      },
    };

    // Store agent instance
    instance.agents[name] = agent;

    // Run registration hooks
    instance.executeHook("onAgentRegister", agent);

    return agent;
  };

  // Agent decorator
  instance.decorateAgent = function (name: string, fn: Function) {
    // Add method to all agent prototypes
    for (const agentName in instance.agents) {
      const agent = instance.agents[agentName];
      agent[name] = fn(agent);
    }

    // Add to future agents
    instance.addHook("onAgentRegister", (agent: AgentInstance) => {
      agent[name] = fn(agent);
    });

    return instance;
  };

  // Build request object with context
  const buildAgentRequest = function (
    task: any,
    input: any,
    context: any
  ): AgentRequest {
    return {
      task,
      body: input,
      params: context.params || {},
      tools: context.tools || {},
      log: context.log || instance.log,
      context: { ...context },
      instance,
    };
  };

  // Build reply object for sending responses
  const buildAgentReply = function (context: any): AgentReply {
    let statusCode = 200;

    const reply: AgentReply = {
      send: context.send || ((data: any) => data),
      error:
        context.error ||
        ((err: Error) => {
          throw err;
        }),
      code: (code: number) => {
        statusCode = code;
        return reply;
      },
    };

    return reply;
  };

  // Helper to get an agent by name
  instance.getAgent = function (name: string) {
    return instance.agents[name];
  };

  // Helper to find agents by capability
  instance.findAgentsByCapability = function (capability: string) {
    return Object.values(instance.agents).filter((agent: AgentInstance) =>
      agent.capabilities.includes(capability)
    );
  };

  // Initialize all agents
  instance.initializeAgents = async function () {
    for (const name in instance.agents) {
      const agent = instance.agents[name];
      if (agent.init) {
        await agent.init();
      }
    }
  };

  // Shutdown all agents
  instance.shutdownAgents = async function () {
    for (const name in instance.agents) {
      const agent = instance.agents[name];
      if (agent.shutdown) {
        await agent.shutdown();
      }
    }
  };

  // Register lifecycle hooks
  instance.addHook("onReady", async () => {
    await instance.initializeAgents();
  });

  instance.addHook("onClose", async () => {
    await instance.shutdownAgents();
  });
}
