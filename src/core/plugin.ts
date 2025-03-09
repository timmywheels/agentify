import { AgentifyInstance } from "./agentify.js";

/**
 * Plugin type definition - a function that receives the Agentify instance and options
 */
export type Plugin = (
  instance: AgentifyInstance,
  opts?: RegisterOptions
) => void;

/**
 * Options that can be passed when registering a plugin
 */
export interface RegisterOptions {
  /**
   * Whether to skip the plugin if it's already registered
   */
  skip?: boolean;

  /**
   * Custom configuration for the plugin
   */
  config?: Record<string, any>;

  [key: string]: any;
}

/**
 * Builds the plugin system for the Agentify instance
 */
export default function buildPluginSystem(agentify: AgentifyInstance) {
  // Keep track of registered plugins
  const registeredPlugins = new Set<Plugin>();

  // Implement the register method
  agentify.register = function (plugin: Plugin, opts: RegisterOptions = {}) {
    // Skip if already registered and skip option is true
    if (opts.skip && registeredPlugins.has(plugin)) {
      return agentify;
    }

    // Register the plugin
    try {
      // Call the plugin with the instance and options
      plugin(agentify, opts);

      // Add to registered plugins set
      registeredPlugins.add(plugin);

      // Return the instance for chaining
      return agentify;
    } catch (err) {
      console.error(`Error registering plugin:`, err);
      throw err;
    }
  };

  agentify.listPlugins = function () {
    // print all registered plugins in a readable, tree-like format
    console.log("Registered plugins:");
    for (const plugin of registeredPlugins) {
      console.log(`- ${plugin.name}`);
    }
  };

  agentify.hasPlugin = function (plugin: Plugin) {
    return registeredPlugins.has(plugin);
  };

  agentify.ready = async function () {
    // simulate a delay
    await agentify.executeHook("onReady");
  };

  agentify.start = async function () {
    await agentify.executeHook("onStart");
  };

  return agentify;
}
