import Agentify, { AgentifyInstance } from "../core/agentify";
import agentPlugin, { Agent } from "../plugins/agent";
import toolPlugin, { Tool } from "../plugins/tool";
import openaiPlugin from "../plugins/providers/openai";
import anthropicPlugin from "../plugins/providers/anthropic";
import dotenv from "dotenv";
import z from "zod";

dotenv.config();

async function main() {
  const agentify = Agentify();

  agentify.register(agentPlugin);
  agentify.register(toolPlugin);

  agentify.register(openaiPlugin, {
    apiKey: process.env.OPENAI_API_KEY,
  });

  agentify.register(anthropicPlugin, {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const maybeFullNameSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  });

  const lastNameSchema = z.object({
    lastName: z.string(),
  });

  const fetchUsersTool = agentify.tools.create({
    name: "fetch_users",
    description:
      "Fetch users from the database by first name, last name, or both",
    parameters: maybeFullNameSchema,
    execute: async (args: z.infer<typeof maybeFullNameSchema>) => {
      const allUsers = [
        { id: 1, firstName: "Tim", lastName: "Wheeler" },
        { id: 2, firstName: "Andrea", lastName: "Wheeler" },
        { id: 3, firstName: "Cameron", lastName: "Wheeler" },
        { id: 4, firstName: "Olivia", lastName: "Wheeler" },
        { id: 5, firstName: "John", lastName: "Curro" },
        { id: 6, firstName: "Lisa", lastName: "Curro" },
        { id: 34, firstName: "Mark", lastName: "Green" },
        { id: 35, firstName: "Sandra", lastName: "Adams" },
        { id: 36, firstName: "Paul", lastName: "Nelson" },
        { id: 37, firstName: "Michelle", lastName: "Baker" },
        { id: 38, firstName: "Steven", lastName: "Carter" },
        { id: 39, firstName: "Laura", lastName: "Mitchell" },
        { id: 40, firstName: "John", lastName: "Perez" },
        { id: 41, firstName: "Donna", lastName: "Roberts" },
        { id: 42, firstName: "Andrew", lastName: "Turner" },
        { id: 43, firstName: "Carol", lastName: "Phillips" },
        { id: 44, firstName: "Kevin", lastName: "Campbell" },
        { id: 45, firstName: "Amanda", lastName: "Parker" },
        { id: 46, firstName: "Brian", lastName: "Evans" },
        { id: 47, firstName: "Stephanie", lastName: "Edwards" },
        { id: 48, firstName: "John", lastName: "Collins" },
        { id: 49, firstName: "Deborah", lastName: "Stewart" },
        { id: 50, firstName: "George", lastName: "Sanchez" },
        { id: 51, firstName: "Melissa", lastName: "Morris" },
        { id: 52, firstName: "Edward", lastName: "Rogers" },
        { id: 53, firstName: "Rebecca", lastName: "Reed" },
      ];

      if (args.firstName) {
        return allUsers.filter((user) => user.firstName === args.firstName);
      }

      if (args.lastName) {
        return allUsers.filter((user) => user.lastName === args.lastName);
      }

      if (args.firstName && args.lastName) {
        return allUsers.filter(
          (user) =>
            user.firstName === args.firstName && user.lastName === args.lastName
        );
      }

      return allUsers;
    },
  });

  const greetIndividualTool = agentify.tools.create({
    name: "greet_individual",
    description:
      "Greet an individual by their name with a personalized, friendly message",
    parameters: maybeFullNameSchema,
    execute: async (args: z.infer<typeof maybeFullNameSchema>) => {
      const response = await agentify.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Greet an individual by their name with a personalized, friendly message: [First Name=${args.firstName}, Last Name=${args.lastName}]`,
          },
        ],
      });

      return response.choices[0].message.content;
    },
  });

  const greetFamilyTool = agentify.tools.create({
    name: "greet_family",
    description: "Greet a family with a friendly, personalized message",
    parameters: lastNameSchema,
    execute: async (args: z.infer<typeof lastNameSchema>) => {
      const response = await agentify.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Greet a family with a friendly, personalized message: [Last Name=${args.lastName}]`,
          },
        ],
      });

      return response.choices[0].message.content;
    },
  });

  const agent = agentify.agents.create({
    name: "Greeting Specialist",
    description: "Greet an individual or family with a personalized message",
    tools: [fetchUsersTool, greetIndividualTool, greetFamilyTool],
    options: {
      model: "gpt-4o-mini",
    },
  });

  agentify.listPlugins();
  agentify.tools.print();
  agentify.agents.print();

  const result = await agent.do?.("Greet the Wheeler family");
  console.log("[Agent Result]:", result);

  await agentify.ready();
  await agentify.start();
}

main();
