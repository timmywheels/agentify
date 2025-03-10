# `agentify`

A lightweight TypeScript framework for building AI agents with tools, inspired by [Fastify](https://fastify.dev/)

## Overview

`agentify` is designed to simplify the creation of agent-based AI systems. It provides a plugin-based architecture inspired by [Fastify](https://fastify.dev/), making it easy to build AI agents that can use tools to accomplish tasks.

## Key Features

- **Plugin Architecture**: Extend functionality through a robust plugin system
- **Hooks System**: Well-defined lifecycle hooks for extensibility
- **Type Safety**: Leverage TypeScript and Zod for safer agent development
- **Tool System**: Create atomic tools with validation
- **Agent System**: Build AI agents that use tools to accomplish tasks
- **LLM Integration**: Connect with OpenAI and Anthropic

## Core Primitives

Agentify uses a clear separation of concerns between its core primitives:

### Tools: Atomic Capabilities

Tools are self-contained functions that perform specific, atomic operations that agents can use.

**Characteristics**:

- Single responsibility
- Zod schema validation
- Clear input/output contract
- Simple, focused responsibility

**Example**:

```typescript
const fetchUsersTool = app.tools.create({
  name: "fetch_users",
  description: "Fetch users from the database by name",
  parameters: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
  execute: async (args) => {
    // Implementation
    return users;
  },
});
```

### Agents: Intelligent Actors

Agents are powered by LLMs and can use tools to accomplish tasks.

**Characteristics**:

- Use multiple tools to accomplish tasks
- Powered by language models
- Make decisions about which tools to use
- Handle complex instructions

**Example**:

```typescript
const agent = app.agents.create({
  name: "Greeting Specialist",
  description: "Greet users with personalized messages",
  tools: [fetchUsersTool, greetTool],
  options: {
    model: "gpt-4o-mini", // Specify which model to use
  },
});

// Use the agent
const result = await agent.do("Greet John Smith");
```

### Plugins: Framework Extensions

Plugins extend the framework with new system-level functionality and integrations.

**Example**:

```typescript
// Register core plugins
app.register(agentPlugin);
app.register(toolPlugin);

// Register provider plugins
app.register(openaiPlugin, {
  apiKey: process.env.OPENAI_API_KEY,
});
```

## LLM Integration

Currently supports integration with OpenAI and Anthropic:

```typescript
// Register OpenAI
app.register(openaiPlugin, {
  apiKey: process.env.OPENAI_API_KEY,
});

// Access the OpenAI client
const response = await app.openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "Hello!" }],
});

// Register Anthropic
app.register(anthropicPlugin, {
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Access the Anthropic client
const response = await app.anthropic.messages.create({
  model: "claude-3-sonnet-20240229",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## Getting Started

### Installation

```bash
npm install agentify
```

### Basic Usage

```typescript
import Agentify from "./core/agentify";
import agentPlugin from "./plugins/agent";
import toolPlugin from "./plugins/tool";
import openaiPlugin from "./plugins/providers/openai";
import z from "zod";

// Initialize the framework
const app = Agentify();

// Register plugins
app.register(agentPlugin);
app.register(toolPlugin);
app.register(openaiPlugin, {
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a simple tool
const greetTool = app.tools.create({
  name: "greet",
  description: "Generate a friendly greeting for someone",
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! How are you today?`;
  },
});

// Create an agent that uses the tool
const agent = app.agents.create({
  name: "Greeter",
  description: "An agent that greets people",
  tools: [greetTool],
  options: {
    model: "gpt-3.5-turbo",
  },
});

// Use the agent
const result = await agent.do("Greet Tim");
console.log(result);

// Start the application
await app.ready();
await app.start();
```

## Plugin System

Agentify features a plugin system that allows you to extend its functionality:

### Creating a Plugin

A plugin is a function that receives an `Agentify` instance and optional options:

```typescript
import { AgentifyInstance } from "./core/agentify";

// Define a plugin
export default function myPlugin(app: AgentifyInstance, options = {}) {
  // Add custom functionality
  app.decorate("myFeature", () => {
    console.log("My custom plugin!");
  });

  // You can also add lifecycle hooks
  app.addHook("onReady", async () => {
    console.log("My plugin is ready!");
  });
}
```

### Using a Plugin

```typescript
import Agentify from "./core/agentify";
import myPlugin from "./my-plugin";

async function main() {
  // Create a new Agentify instance
  const app = Agentify();

  // Register your plugin
  app.register(myPlugin);

  // Start the application
  await app.ready();
  await app.start();

  // Use your plugin's functionality
  app.myFeature();
}

main().catch(console.error);
```

### Lifecycle Hooks

Agentify provides lifecycle hooks:

```typescript
app.addHook("onReady", async () => {
  console.log("App is ready!");
});

app.addHook("onClose", async () => {
  console.log("Shutting down...");
});
```

## Development Status

Agentify is in early development. Current features:

- Plugin system with hooks
- Tool creation with Zod schema validation
- Agent creation with LLM-powered tool execution
- OpenAI and Anthropic provider integrations

Future features:

- Task and workflow orchestration
- Memory and state management
- More provider integrations
- Evaluation frameworks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
