import Agentify, { AgentifyInstance } from "../core/agentify";
import agentPlugin, { Agent } from "../plugins/agent";
import taskPlugin, { Task } from "../plugins/task";
import toolPlugin, { Tool } from "../plugins/tool";
import openaiPlugin from "../plugins/providers/openai";
import anthropicPlugin from "../plugins/providers/anthropic";
import dotenv from "dotenv";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";

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

  agentify.register(agentPlugin);
  agentify.register(taskPlugin);
  agentify.register(toolPlugin);
  agentify.register(myOnReadyPlugin);
  agentify.register(myOnStartPlugin);

  agentify.register(openaiPlugin, {
    apiKey: process.env.OPENAI_API_KEY,
  });

  agentify.register(anthropicPlugin, {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const schema = z.object({
    firstName: z.string(),
  });

  const fetchUsersTool: Tool = {
    name: "FetchUsers",
    description: "Fetch users from the database",
    parameters: schema,
    execute: async (args: z.infer<typeof schema>) => {
      const fetchUsers = async () => {
        setTimeout(() => {
          const allUsers = [
            { id: 1, firstName: "John", lastName: "Doe" },
            { id: 2, firstName: "Jane", lastName: "Doe" },
          ];

          const filteredUsers = allUsers.filter((user) =>
            user.firstName.includes(args.firstName)
          );

          return Promise.resolve(filteredUsers);
        }, 3000);
      };

      return fetchUsers();
    },
  };

  agentify.tools.create(fetchUsersTool);

  const task: Task = {
    name: "FetchUsers",
    goal: "Fetch users from the database with the first name John",
    context: {},
    options: {},
    status: "pending",
  };

  const agent: Agent = {
    name: "MyGreetingAgent",
    description: "My Greeting Agent Description",
    tools: [fetchUsersTool],
    options: {
      model: "gpt-4o-mini",
    },
  };

  agentify.tasks.create(task);
  agentify.agents.create(agent);

  agentify.listPlugins();
  agentify.tools.print();
  agentify.tasks.print();
  agentify.agents.print();

  console.log("agent.do__:", agent.do);
  agent.do?.(task);

  await agentify.ready();
  await agentify.start();
}

main();
