# `agentify`

A lightweight TypeScript framework for building, deploying, evaluating, and orchestrating agentic workflows, inspired by [Fastify](https://fastify.dev/)

## Overview

`agentify` is designed to simplify the creation and orchestration of agent-based AI systems. It provides a declarative, composable API inspired by [Fastify](https://fastify.dev/), making it easy to build complex agentic workflows with minimal boilerplate.

## Key Features

- **Plugin Architecture**: Extend functionality through a robust plugin system
- **Hooks System**: Well-defined lifecycle hooks for extensibility
- **Composable Components**: Build complex workflows from simpler building blocks
- **Type Safety**: Leverage TypeScript for safer agent development
- **Loose Coupling**: Components work together but aren't tightly bound
- **Declarative API**: Focus on what your agents should do, not how
- **Intelligent Orchestration**: Automatic task decomposition and agent selection

## Core Primitives and Boundaries

Agentify uses a clear separation of concerns between its core primitives:

### Tools: Atomic Capabilities

Tools are self-contained functions that perform specific, atomic operations without decision-making logic.

**Characteristics**:

- Single responsibility
- Stateless execution
- Pure input/output transformation
- No dependencies on other tools
- No orchestration or decision-making

**Example**:

```typescript
app.tool("webSearch", {
  description: "Search the web for information",
  use: async (input) => {
    // Implementation of web search
    return searchResults;
  },
});
```

### Agents: Intelligent Actors

Agents are autonomous entities that use tools and reasoning to achieve goals. They make decisions, follow plans, and adapt to feedback.

**Characteristics**:

- Use multiple tools to accomplish tasks
- Have defined capabilities
- Make decisions about which tools to use
- Can maintain conversation state
- Handle errors and adapt to changing conditions

**Example**:

```typescript
app.agent("researchAgent", {
  capabilities: ["search", "analyze"],
  execute: async (request, reply) => {
    const searchResults = await request.tools.webSearch({
      query: request.body.topic,
    });

    const analysis = analyzeResults(searchResults);

    reply.send({ results: searchResults, analysis });
  },
});
```

### Tasks: Defined Units of Work

Tasks are well-defined units of work with explicit inputs and outputs, serving as building blocks for larger workflows.

**Characteristics**:

- Clear input/output contract
- Simple, focused responsibility
- Reusable across workflows
- Composable into larger operations
- Stateless execution

**Example**:

```typescript
app.task("fetchData", {
  handler: async (input, context) => {
    const data = await fetchFromApi(input.url);
    return { data };
  },
});
```

### Workflows: Orchestrated Processes

Workflows define the sequence, branching, and data flow between tasks and agents to achieve complex goals.

**Characteristics**:

- Define execution order
- Map inputs between steps
- Handle conditional branching
- Manage error handling and retries
- Track overall progress

**Example**:

```typescript
app
  .workflow("researchWorkflow")
  .task("search", {
    taskName: "fetchData",
    inputMap: { url: "searchUrl" },
  })
  .task("analyze", {
    taskName: "analyzeData",
    inputMap: { data: "steps.search.data" },
  })
  .sequence(["search", "analyze"]);
```

### Orchestrator: Intelligent Coordinator

The orchestrator analyzes tasks, selects appropriate agents, and manages the execution flow.

**Characteristics**:

- Task decomposition and analysis
- Agent selection based on capabilities
- Evaluation of results against criteria
- Retry management
- Result aggregation and synthesis

**Example**:

```typescript
// Define task declaratively
const researchTask = {
  name: "researchTopic",
  description: "Research a topic thoroughly",
  goal: "Gather comprehensive information on a topic",
  requiredCapabilities: ["research", "analyze"],
  input: { topic: "string" },
};

// Let the orchestrator handle execution
const result = await app.run(researchTask, { topic: "Quantum Computing" });
```

### Plugins: Framework Extensions

Plugins extend the framework with new system-level functionality, integrations, or providers.

**Characteristics**:

- Modify or extend core framework behavior
- Add new integrations (LLMs, databases, etc.)
- Configure global settings
- Register new tools, agents, or hooks
- Affect multiple parts of the system

**Example**:

```typescript
// Register an LLM provider plugin
app.register(require("agentify-openai"), {
  apiKey: process.env.OPENAI_API_KEY,
});
```

## LLM Integration

LLMs can be integrated at multiple levels in the architecture:

1. **As Tools**: Providing capabilities for text generation, summarization, etc.

   ```typescript
   app.tool("textGeneration", {
     description: "Generate text based on a prompt",
     use: async (input) => llmProvider.complete(input.prompt),
   });
   ```

2. **Powering Agents**: Providing reasoning and decision-making for agents

   ```typescript
   app.agent("llmAgent", {
     capabilities: ["reasoning", "writing"],
     execute: async (request, reply) => {
       // Use LLM to decide which tools to use and how
       // ...
     },
   });
   ```

3. **In the Orchestrator**: For intelligent task decomposition and evaluation
   ```typescript
   // The orchestrator uses LLMs internally to analyze tasks,
   // decompose them optimally, and evaluate results
   ```

## Getting Started

### Installation

```bash
npm install agentify
```

### Basic Usage

```typescript
import { Agentify } from "agentify";

// Initialize the framework
const app = Agentify({
  logger: true,
});

// Define a task
app.task("greetUser", {
  handler: async (input) => {
    return { message: `Hello, ${input.name}!` };
  },
});

// Define a workflow
const workflow = app.workflow("greetingFlow").task("greet", {
  taskName: "greetUser",
  inputMap: {
    name: "userName",
  },
});

// Execute the workflow
app.ready().then(async () => {
  const result = await workflow.execute({
    userName: "World",
  });

  console.log(result.message); // Hello, World!
});
```

### Declarative Task Definition

```typescript
// Define a task declaratively
const analyzeNews = app.defineTask({
  name: "analyzeNews",
  description: "Analyze recent news on a topic",
  goal: "Provide insights on recent developments",
  requiredCapabilities: ["research", "analyze"],
  input: {
    topic: "string",
    timeframe: "string?", // Optional
  },
});

// Execute the task
const result = await analyzeNews({
  topic: "AI safety",
  timeframe: "last week",
});
```

### Advanced Examples

See the [examples directory](./src/examples) for more comprehensive examples:

- **Simple Workflows**: Basic task sequencing and data passing
- **Conditional Workflows**: Branching based on results
- **Agentic Workflows**: Complex integration of agents and tools
- **Declarative Tasks**: Using the orchestrator for automatic execution

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Plugin System

Agentify features a powerful plugin system that allows you to extend its functionality in a modular way.

### Creating a Plugin

A plugin is simply a function that receives an `Agentify` instance and optional options:

```typescript
import { Agentify } from "./src/core/agentify";

// Define a simple plugin
export default function myPlugin(agentify: Agentify, options = {}) {
  // Add custom functionality
  const myFunction = () => console.log("My custom plugin!");

  // Decorate the instance with your functionality
  agentify.decorate("myPlugin", myFunction);

  // You can also add lifecycle hooks
  agentify.addHook("onReady", async () => {
    console.log("My plugin is ready!");
  });
}
```

### Using a Plugin

To use a plugin, simply register it with your Agentify instance:

```typescript
import Agentify from "./src/core/agentify";
import myPlugin from "./my-plugin";

async function main() {
  // Create a new Agentify instance
  const agentify = Agentify();

  // Register your plugin
  agentify.register(myPlugin);

  // Start the application
  await agentify.start();

  // Use your plugin's functionality
  agentify.myPlugin();

  // Properly shut down
  await agentify.close();
}

main().catch(console.error);
```

### Plugin Options and Dependencies

You can pass options to your plugins and specify dependencies:

```typescript
agentify.register(myPlugin, {
  name: "myPlugin",
  // Custom options for your plugin
  someOption: "value",
  // Specify dependencies
  dependencies: ["anotherPlugin"],
});
```

### Lifecycle Hooks

Agentify provides lifecycle hooks that plugins can use:

- `onReady`: Called when the application is ready to start
- `onClose`: Called when the application is shutting down

```typescript
agentify.addHook("onReady", async () => {
  console.log("Ready to go!");
});

agentify.addHook("onClose", async () => {
  console.log("Shutting down...");
});
```

## Examples

Check out the `examples` directory for more examples of how to use Agentify and its plugin system:

- **Simple Workflows**: Basic task sequencing and data passing
- **Conditional Workflows**: Branching based on results
- **Agentic Workflows**: Complex integration of agents and tools
- **Declarative Tasks**: Using the orchestrator for automatic execution

## License

MIT
