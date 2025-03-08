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

## Core Components

### Tasks

Tasks are units of work with defined inputs and outputs:

```typescript
app.task("fetchData", {
  handler: async (input, context) => {
    const data = await fetchFromApi(input.url);
    return { data };
  },
});
```

### Agents

Agents are entities that perform specific functions using tools:

```typescript
app.agent("researchAgent", {
  capabilities: ["search", "analyze"],
  execute: async (request, reply) => {
    const searchResults = await request.tools.webSearch({
      query: request.body.topic,
    });

    reply.send({ results: searchResults });
  },
});
```

### Tools

Tools are specific capabilities that agents can use:

```typescript
app.tool("webSearch", {
  description: "Search the web for information",
  use: async (input) => {
    // Implementation of web search
    return searchResults;
  },
});
```

### Workflows

Workflows orchestrate tasks and agents to achieve complex goals:

```typescript
app
  .workflow("researchWorkflow")
  .task("search", {
    taskName: "fetchData",
    inputMap: {
      url: "searchUrl",
    },
  })
  .task("analyze", {
    taskName: "analyzeData",
    inputMap: {
      data: "steps.search.data",
    },
  })
  .sequence(["search", "analyze"]);
```

## Getting Started

### Installation

```bash
npm install agentify
```

### Basic Usage

```typescript
import { Agentify } from "agen-ts";

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

### Advanced Example

See the [examples directory](./src/examples) for more comprehensive examples:

- **Simple Workflows**: Basic task sequencing and data passing
- **Conditional Workflows**: Branching based on results
- **Agentic Workflows**: Complex integration of agents and tools

## Extending the Framework

The plugin system allows easy extension of the framework:

```typescript
// Register a plugin
app.register(require("agen-ts-openai-plugin"), {
  apiKey: process.env.OPENAI_API_KEY,
});

// Use the plugin's components
app.task("generateText", {
  handler: async (input, context) => {
    return await context.instance.tools.openai.complete({
      prompt: input.prompt,
    });
  },
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.
