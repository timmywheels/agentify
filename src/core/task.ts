import { Agents } from "../core/agen";

// Define task option types
interface TaskSchema {
  input?: any;
  output?: any;
}

interface TaskOptions {
  schema?: TaskSchema;
  handler: (input: any, context: any) => Promise<any> | any;
  description?: string;
}

interface TaskInstance {
  name: string;
  schema?: TaskSchema;
  handler: (input: any, context: any) => Promise<any> | any;
  description?: string;
  execute: (input: any, context?: any) => Promise<any>;
  [key: string]: any; // For decorators
}

interface Tasks {
  [key: string]: TaskInstance;
}

export function buildTaskSystem(instance: ReturnType<typeof Agen>) {
  // Task storage
  instance.tasks = {} as Tasks;

  //
  //  Task registration
  instance.task = function (name: string, options: TaskOptions) {
    if (instance.tasks[name]) {
      throw new Error(`Task ${name} already registered`);
    }

    // Create task instance
    const task: TaskInstance = {
      name,
      schema: options.schema,
      handler: options.handler,
      description: options.description,
      execute: (input: any, context?: any) => {
        return executeTask(name, input, context || {});
      },
    };

    // Store task definition
    instance.tasks[name] = task;

    // Return task for chaining
    return task;
  };

  // Task decorator
  instance.decorateTask = function (name: string, fn: any) {
    // Add method to all task prototypes
    for (const taskName in instance.tasks) {
      const task = instance.tasks[taskName];
      task[name] = fn(task);
    }

    // Add to future tasks
    instance.addHook("onTaskRegister", (task: TaskInstance) => {
      task[name] = fn(task);
    });
  };

  // Task execution method
  const executeTask = async function (name: string, input: any, context: any) {
    const task = instance.tasks[name];
    if (!task) {
      throw new Error(`Task ${name} not found`);
    }

    try {
      // Create context with useful references
      const execContext = {
        ...context,
        task: task,
        instance: instance,
        log: instance.log ? instance.log.child({ task: name }) : null,
      };

      // Run pre-execution hooks
      await instance.executeHook("onTaskStart", task, input, execContext);

      // Validate input schema if present
      if (task.schema?.input) {
        const valid = instance.validate(input, task.schema.input);
        if (!valid) {
          throw new Error(`Input validation failed for task ${name}`);
        }
      }

      // Execute task handler
      let result = await task.handler(input, execContext);

      // Validate output schema if present
      if (task.schema?.output) {
        const valid = instance.validate(result, task.schema.output);
        if (!valid) {
          throw new Error(`Output validation failed for task ${name}`);
        }
      }

      // Run post-execution hooks
      await instance.executeHook("onTaskEnd", task, input, result, execContext);

      return result;
    } catch (error) {
      // Run error hooks
      await instance.executeHook("onTaskError", task, input, error, context);
      throw error;
    }
  };

  // Helper to get a task by name
  instance.getTask = function (name: string) {
    return instance.tasks[name];
  };

  // Helper to execute a task directly
  instance.executeTask = function (name: string, input: any, context?: any) {
    return executeTask(name, input, context || {});
  };

  // Register onTaskRegister hook for decorators
  if (!instance.hooks.onTaskRegister) {
    instance.hooks.onTaskRegister = [];
  }
}
