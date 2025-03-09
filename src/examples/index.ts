import Agentify, { AgentifyInstance } from "../core/agentify";
import agentPlugin, { Agent } from "../plugins/agent";
import taskPlugin from "../plugins/task";
import toolPlugin, { Tool } from "../plugins/tool";
import openaiPlugin from "../plugins/providers/openai";
import anthropicPlugin from "../plugins/providers/anthropic";
import dotenv from "dotenv";
import z from "zod";

dotenv.config();

async function main() {
  const agentify = Agentify();

  const myOnReadyPlugin = (agentify: AgentifyInstance) => {
    agentify.addHook("onReady", async () => {
      console.log("Agentify is ready!");
    });
  };

  const myOnStartPlugin = (agentify: AgentifyInstance) => {
    agentify.addHook("onStart", async () => {
      console.log("Agentify is starting...");
    });
  };

  const myTool: Tool = {
    name: "myTool",
    description: "My Tool Description",
    schema: z.object({
      name: z.string(),
    }),
    execute: async (input: string) => {
      return "Hello, world!";
    },
  };

  const agent: Agent = {
    name: "My Greeting Agent",
    description: "My Greeting Agent Description",
    tools: [myTool],
    options: {},
  };

  agentify.register(agentPlugin);
  agentify.register(taskPlugin);
  agentify.register(toolPlugin);

  agentify.agents.create(agent);

  agentify.register(myOnReadyPlugin);
  agentify.register(myOnStartPlugin);

  agentify.register(openaiPlugin, {
    apiKey: process.env.OPENAI_API_KEY,
  });

  agentify.register(anthropicPlugin, {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  agentify.listPlugins();
  agentify.tools.print();
  agentify.tasks.print();
  agentify.agents.print();

  await agentify.ready();
  await agentify.start();
}

main();
