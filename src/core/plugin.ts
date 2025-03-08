import { Agentify } from "./agentify";

/**
 * Base options for plugins
 */
interface PluginOptions {
  [key: string]: any;
}

/**
 * Plugin function definition - a plugin takes an instance and optional options,
 * and can return void or a Promise
 */
interface Plugin {
  (
    instance: ReturnType<typeof Agentify>,
    opts?: PluginOptions
  ): Promise<void> | void;
}

/**
 * Extended options for plugin registration with Fastify-like features:
 * - prefix: Namespace for the plugin
 * - dependencies: List of plugins this plugin depends on
 */
interface RegisterOptions extends PluginOptions {
  prefix?: string;
  dependencies?: string[];
  name?: string; // Optional plugin name for identification
}

/**
 * Extended instance type that includes all the internal plugin system properties
 * These properties are used to track the plugin hierarchy and state
 */
type PluginSystemInstance = ReturnType<typeof Agentify> & {
  _parent?: PluginSystemInstance; // Reference to parent scope
  _children?: PluginSystemInstance[]; // Child scopes created by this instance
  _pluginPromises?: Promise<any>[]; // Async plugin promises to await
  _afterHandlers?: Array<() => Promise<void> | void>; // Handlers to run after plugins load
  _plugins?: Map<string, { plugin: Plugin; options: RegisterOptions }>; // Registered plugins
  _loaded?: boolean; // Flag to prevent multiple initialization
  _prefix?: string; // Plugin namespace prefix if any
};

/**
 * Builds the plugin system for the Agentify framework
 * This is inspired by Fastify's plugin system which provides encapsulation
 * and a powerful composition model
 */
export function buildPluginSystem(instance: ReturnType<typeof Agentify>) {
  // Cast to our extended type to add plugin-specific properties
  const enhancedInstance = instance as PluginSystemInstance;

  // Initialize internal plugin system state
  enhancedInstance._plugins = new Map(); // Store registered plugins
  enhancedInstance._pluginPromises = []; // Track async plugin promises
  enhancedInstance._children = []; // Track child scopes
  enhancedInstance._loaded = false; // Mark as not loaded initially

  /**
   * Plugin registration with proper encapsulation
   * This is the core of the plugin system, allowing plugins to:
   * - Have their own isolated scope
   * - Inherit from parent scopes
   * - Register their own sub-plugins
   */
  enhancedInstance.register = function (
    plugin: Plugin,
    opts: RegisterOptions = {}
  ) {
    // Safety check - prevent registering plugins after the app is loaded
    if (enhancedInstance._loaded) {
      throw new Error(
        "Cannot register plugin after the application has been loaded"
      );
    }

    // Generate a unique ID for the plugin if not provided
    // This allows referencing plugins for dependencies
    const pluginId =
      opts.name || `plugin_${Math.random().toString(36).substring(2, 9)}`;

    // Check that all dependencies are registered before this plugin
    // This ensures correct initialization order
    if (opts.dependencies) {
      for (const dep of opts.dependencies) {
        if (!enhancedInstance._plugins?.has(dep)) {
          throw new Error(
            `Plugin ${pluginId} depends on ${dep}, but it is not registered`
          );
        }
      }
    }

    // Store plugin for tracking and dependency management
    enhancedInstance._plugins?.set(pluginId, { plugin, options: opts });

    // Create encapsulated context for the plugin using prototypal inheritance
    // This is key to Fastify's model - a plugin gets its own scope that
    // inherits from parent but doesn't affect it
    const childInstance = Object.create(
      enhancedInstance
    ) as PluginSystemInstance;

    // Setup parent-child relationship for scope inheritance
    // This allows traversing the plugin tree when needed
    childInstance._parent = enhancedInstance;
    enhancedInstance._children?.push(childInstance);

    // Initialize plugin storage for this new scope
    // Each plugin scope has its own independent tracking
    childInstance._plugins = new Map();
    childInstance._pluginPromises = [];
    childInstance._children = [];

    // Add prefix to this instance if specified
    // This enables namespacing plugins (like routes in Fastify)
    if (opts.prefix) {
      childInstance._prefix = opts.prefix;
    }

    // Execute the plugin with the encapsulated context
    try {
      // Run the plugin function with the child instance
      const pluginResult = plugin(childInstance, opts);

      // If plugin returns a promise, track it to wait for async initialization
      if (pluginResult && typeof pluginResult.then === "function") {
        enhancedInstance._pluginPromises?.push(pluginResult);
      }
    } catch (err) {
      // Provide helpful error message if plugin initialization fails
      enhancedInstance.log?.error(
        `Error initializing plugin ${pluginId}:`,
        err
      );
      throw err;
    }

    // Enable method chaining for registration
    return enhancedInstance;
  };

  /**
   * Add after hook for plugin dependencies
   * This allows running code after all plugins are registered but before ready()
   * Useful for plugins that need to set up resources after dependencies are registered
   */
  enhancedInstance.after = function (fn: () => Promise<void> | void) {
    // Initialize the after handlers array if not exist
    enhancedInstance._afterHandlers = enhancedInstance._afterHandlers || [];
    enhancedInstance._afterHandlers.push(fn);
    return enhancedInstance;
  };

  /**
   * Decorator system with proper inheritance
   * Allows plugins to add new properties/methods to the instance
   * without affecting parent scopes
   */
  enhancedInstance.decorate = function (name: string, value: any) {
    // Safety check - prevent overriding existing properties
    if (name in enhancedInstance) {
      throw new Error(`Property '${name}' already exists`);
    }

    // Add property to the instance
    enhancedInstance[name] = value;

    return enhancedInstance;
  };

  /**
   * Check if a decorator exists
   * Helper method to check if a property/method already exists
   */
  enhancedInstance.hasDecorator = function (name: string) {
    return name in enhancedInstance;
  };

  /**
   * Add decorators that don't override existing ones
   * Useful for optional features
   */
  enhancedInstance.decorateIfNotExists = function (name: string, value: any) {
    if (!enhancedInstance.hasDecorator(name)) {
      enhancedInstance.decorate(name, value);
    }
    return enhancedInstance;
  };

  /**
   * Method to define a plugin with a name
   * This makes plugins more identifiable and debuggable
   */
  enhancedInstance.definePlugin = function (name: string, pluginFn: Plugin) {
    // Create a wrapper function that preserves the plugin logic
    const namedPlugin: Plugin = function (instanceToUse, opts) {
      return pluginFn(instanceToUse, opts || {});
    };

    // Add a displayName for debugging and stack traces
    Object.defineProperty(namedPlugin, "name", { value: name });

    return namedPlugin;
  };

  /**
   * Enhanced ready method with proper lifecycle management
   * This bootstraps the entire application:
   * 1. Waits for async plugins
   * 2. Runs after handlers
   * 3. Executes hooks
   * 4. Initializes children recursively
   */
  enhancedInstance.ready = async function (): Promise<void> {
    // Prevent multiple loading - return early if already loaded
    if (enhancedInstance._loaded) {
      return;
    }

    try {
      // Wait for all async plugins to complete
      // This ensures all plugin promises resolve before proceeding
      if (
        enhancedInstance._pluginPromises &&
        enhancedInstance._pluginPromises.length > 0
      ) {
        await Promise.all(enhancedInstance._pluginPromises);
      }

      // Run after handlers for this instance
      // These run after plugins are registered but before ready completes
      if (enhancedInstance._afterHandlers) {
        for (const handler of enhancedInstance._afterHandlers) {
          await handler();
        }
      }

      // Run onReady hooks - allows plugins to hook into app initialization
      if (enhancedInstance.executeHook) {
        await enhancedInstance.executeHook("onReady", enhancedInstance);
      }

      // Initialize all child instances recursively
      // This ensures the entire plugin tree is initialized in the right order
      if (enhancedInstance._children) {
        for (const child of enhancedInstance._children) {
          await child.ready();
        }
      }

      // Mark as loaded to prevent multiple initialization
      enhancedInstance._loaded = true;

      return;
    } catch (err) {
      // Provide helpful error for initialization failures
      enhancedInstance.log?.error("Error during application bootstrap:", err);
      throw err;
    }
  };

  /**
   * Close method for cleanup
   * Ensures proper shutdown of all plugins and resources
   */
  enhancedInstance.close = async function () {
    try {
      // Run onClose hooks - allows plugins to clean up resources
      if (enhancedInstance.executeHook) {
        await enhancedInstance.executeHook("onClose", enhancedInstance);
      }

      // Close all child instances first - bottom-up cleanup
      if (enhancedInstance._children) {
        for (const child of enhancedInstance._children) {
          await child.close();
        }
      }

      return;
    } catch (err) {
      // Provide helpful error for shutdown failures
      enhancedInstance.log?.error("Error during application shutdown:", err);
      throw err;
    }
  };

  /**
   * Helper to print the plugin tree for debugging
   * Creates a visual representation of the plugin hierarchy
   */
  enhancedInstance.printPlugins = function () {
    // Recursive function to print the plugin tree
    const printTree = (instance: PluginSystemInstance, depth = 0) => {
      const indent = "  ".repeat(depth);
      // Print this instance with its prefix if any
      console.log(
        `${indent}Instance${
          instance._prefix ? ` (prefix: ${instance._prefix})` : ""
        }`
      );

      // Print all plugins registered directly on this instance
      instance._plugins?.forEach((pluginData, name) => {
        console.log(`${indent}  Plugin: ${name}`);
      });

      // Recursively print child instances
      instance._children?.forEach((child) => {
        printTree(child, depth + 1);
      });
    };

    // Start printing from the root instance
    printTree(enhancedInstance);
  };

  return enhancedInstance;
}
