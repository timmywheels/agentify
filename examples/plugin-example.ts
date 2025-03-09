import Agentify from "../src/core/agentify";
import { Plugin } from "../src/core/plugin";

// Define a simple plugin
const myPlugin: Plugin = (agentify, options = {}) => {
  // Add a custom method to the agentify instance
  const myFunctionality = () => console.log("My custom plugin is working!");

  // Decorate the instance with our custom functionality
  agentify.decorate("myPlugin", myFunctionality);

  // You can also add hooks
  agentify.addHook("onReady", async () => {
    console.log("My plugin is ready!");
  });

  // You can also add hooks for shutdown
  agentify.addHook("onClose", async () => {
    console.log("My plugin is shutting down!");
  });
};

// Another plugin that depends on the first one
const anotherPlugin: Plugin = (agentify, options = {}) => {
  // Check if the first plugin is available
  if (!agentify.hasDecorator("myPlugin")) {
    throw new Error("This plugin depends on myPlugin!");
  }

  // Use functionality from the first plugin
  agentify.decorate("enhancedPlugin", () => {
    console.log("Enhanced plugin is calling the original plugin:");
    agentify.myPlugin();
  });
};

async function main() {
  // Create a new Agentify instance
  const agentify = Agentify();

  // Register our plugins
  agentify.register(myPlugin, { name: "myPlugin" });
  agentify.register(anotherPlugin, {
    name: "enhancedPlugin",
    dependencies: ["myPlugin"], // Specify dependencies
  });

  // Start the application - this will call ready() first
  await agentify.start();

  // Use our custom functionality
  agentify.myPlugin();
  agentify.enhancedPlugin();

  // Properly shut down
  await agentify.close();
}

// Run the example
main().catch(console.error);
