import { Agentify } from "./agentify";

// Workflow step types
type StepType = "task" | "parallel" | "condition" | "map" | "retry";

// Step configuration
interface WorkflowStep {
  id: string;
  type: StepType;
  name?: string;
  next?: string | string[] | null;
  config: any;
}

// Task step configuration
interface TaskStep extends WorkflowStep {
  type: "task";
  config: {
    taskName: string;
    inputMap?: Record<string, string | ((context: any) => any)>;
    outputMap?: Record<string, string>;
    condition?: (context: any) => boolean | Promise<boolean>;
    retries?: number;
    retryDelay?: number;
  };
}

// Parallel step configuration
interface ParallelStep extends WorkflowStep {
  type: "parallel";
  config: {
    branches: string[];
    waitForAll?: boolean;
  };
}

// Condition step for branching
interface ConditionStep extends WorkflowStep {
  type: "condition";
  config: {
    condition: (context: any) => boolean | Promise<boolean>;
    trueNext: string;
    falseNext: string;
  };
}

// Map step for working with arrays
interface MapStep extends WorkflowStep {
  type: "map";
  config: {
    items: string | any[];
    iteratorTask: string;
    concurrency?: number;
  };
}

// Retry step for retrying failed steps
interface RetryStep extends WorkflowStep {
  type: "retry";
  config: {
    stepId: string;
    maxRetries: number;
    delay?: number;
    backoffFactor?: number;
    condition?: (error: any, attempts: number) => boolean | Promise<boolean>;
  };
}

// Workflow definition
interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: Record<string, WorkflowStep>;
  entrypoint: string;
  schema?: {
    input?: any;
    output?: any;
  };
  tags?: string[];
}

// Workflow execution context
interface WorkflowContext {
  input: any;
  steps: Record<string, any>;
  output: any;
  currentStep?: string;
  errors: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  metadata: Record<string, any>;
  [key: string]: any;
}

// Workflow instance exposed to users
interface WorkflowInstance {
  id: string;
  name: string;
  description: (desc: string) => WorkflowInstance;
  schema?: {
    input?: any;
    output?: any;
  };
  tags: string[];

  // Add a task step
  task: (
    id: string,
    options: Omit<TaskStep["config"], "taskName"> & { taskName: string }
  ) => WorkflowInstance;

  // Add a parallel step
  parallel: (id: string, options: ParallelStep["config"]) => WorkflowInstance;

  // Add a condition step
  condition: (id: string, options: ConditionStep["config"]) => WorkflowInstance;

  // Define workflow input/output schema
  input: (schema: any) => WorkflowInstance;
  output: (schema: any) => WorkflowInstance;

  // Define a sequence of steps
  sequence: (ids: string[]) => WorkflowInstance;

  // Execute the workflow
  execute: (input?: any, options?: any) => Promise<any>;

  // Other methods
  getDefinition: () => WorkflowDefinition;
  onCompleted: (
    handler: (output: any, context: WorkflowContext) => void
  ) => WorkflowInstance;
  onError: (
    handler: (error: any, context: WorkflowContext) => void
  ) => WorkflowInstance;

  // Custom properties added via decorators
  [key: string]: any;
}

export function buildWorkflowSystem(instance: ReturnType<typeof Agentify>) {
  // Workflow storage
  instance.workflows = {} as Record<string, WorkflowInstance>;

  // Workflow registration and builder
  instance.workflow = function (id: string) {
    if (instance.workflows[id]) {
      throw new Error(`Workflow ${id} already registered`);
    }

    // Create workflow definition
    const definition: WorkflowDefinition = {
      id,
      name: id,
      steps: {},
      entrypoint: "",
      tags: [],
    };

    // Create event handlers
    const eventHandlers = {
      onCompleted: [] as ((output: any, context: WorkflowContext) => void)[],
      onError: [] as ((error: any, context: WorkflowContext) => void)[],
    };

    // Create workflow instance with builder methods
    const workflow: WorkflowInstance = {
      id,
      name: id,
      tags: [],

      // Add name/description
      description: function (desc: string) {
        definition.description = desc;
        return workflow;
      },

      // Define task step
      task: function (
        id: string,
        options: Omit<TaskStep["config"], "taskName"> & { taskName: string }
      ) {
        if (!instance.tasks[options.taskName]) {
          throw new Error(`Task ${options.taskName} not found`);
        }

        const step: TaskStep = {
          id,
          type: "task",
          name: options.taskName,
          config: {
            taskName: options.taskName,
            inputMap: options.inputMap,
            outputMap: options.outputMap,
            condition: options.condition,
            retries: options.retries,
            retryDelay: options.retryDelay,
          },
        };

        definition.steps[id] = step;
        if (!definition.entrypoint) {
          definition.entrypoint = id;
        }

        return workflow;
      },

      // Define parallel step
      parallel: function (id: string, options: ParallelStep["config"]) {
        const step: ParallelStep = {
          id,
          type: "parallel",
          config: {
            branches: options.branches,
            waitForAll: options.waitForAll !== false,
          },
        };

        definition.steps[id] = step;
        return workflow;
      },

      // Define condition step
      condition: function (id: string, options: ConditionStep["config"]) {
        const step: ConditionStep = {
          id,
          type: "condition",
          config: {
            condition: options.condition,
            trueNext: options.trueNext,
            falseNext: options.falseNext,
          },
        };

        definition.steps[id] = step;
        return workflow;
      },

      // Define input schema
      input: function (schema: any) {
        if (!definition.schema) definition.schema = {};
        definition.schema.input = schema;
        return workflow;
      },

      // Define output schema
      output: function (schema: any) {
        if (!definition.schema) definition.schema = {};
        definition.schema.output = schema;
        return workflow;
      },

      // Define sequence flow
      sequence: function (ids: string[]) {
        if (ids.length === 0) return workflow;

        // Link steps together
        for (let i = 0; i < ids.length - 1; i++) {
          const currentId = ids[i];
          const nextId = ids[i + 1];

          if (!definition.steps[currentId]) {
            throw new Error(
              `Step ${currentId} not found in workflow ${definition.id}`
            );
          }

          if (!definition.steps[nextId]) {
            throw new Error(
              `Step ${nextId} not found in workflow ${definition.id}`
            );
          }

          definition.steps[currentId].next = nextId;
        }

        // Set entrypoint if not already set
        if (!definition.entrypoint) {
          definition.entrypoint = ids[0];
        }

        return workflow;
      },

      // Get the workflow definition
      getDefinition: function () {
        return definition;
      },

      // Event handlers
      onCompleted: function (handler) {
        eventHandlers.onCompleted.push(handler);
        return workflow;
      },

      onError: function (handler) {
        eventHandlers.onError.push(handler);
        return workflow;
      },

      // Execute the workflow
      execute: async function (input: any = {}, options: any = {}) {
        // Create workflow context
        const context: WorkflowContext = {
          input,
          steps: {},
          output: {},
          errors: {},
          startTime: new Date(),
          metadata: options.metadata || {},
        };

        // Run pre-execution hooks
        await instance.executeHook("onWorkflowStart", workflow, context);

        try {
          // Execute the workflow
          context.output = await executeWorkflow(definition, context);

          // Run post-execution hooks
          await instance.executeHook(
            "onWorkflowEnd",
            workflow,
            context,
            context.output
          );

          // Call completion handlers
          for (const handler of eventHandlers.onCompleted) {
            handler(context.output, context);
          }

          return context.output;
        } catch (error) {
          // Record error
          context.errors["workflow"] = error;

          // Run error hooks
          await instance.executeHook(
            "onWorkflowError",
            workflow,
            context,
            error
          );

          // Call error handlers
          for (const handler of eventHandlers.onError) {
            handler(error, context);
          }

          throw error;
        }
      },
    };

    // Store the workflow
    instance.workflows[id] = workflow;

    // Return the workflow builder for chaining
    return workflow;
  };

  // Workflow execution engine
  async function executeWorkflow(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<any> {
    const startStepId = workflow.entrypoint;
    return executeStep(startStepId, workflow, context);
  }

  // Execute a single step
  async function executeStep(
    stepId: string,
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<any> {
    // Get the step
    const step = workflow.steps[stepId];
    if (!step) {
      throw new Error(`Step ${stepId} not found in workflow ${workflow.id}`);
    }

    // Set current step in context
    context.currentStep = stepId;

    // Run pre-step hooks
    await instance.executeHook("onWorkflowStepStart", workflow, step, context);

    try {
      let result;

      // Execute based on step type
      switch (step.type) {
        case "task":
          result = await executeTaskStep(step as TaskStep, workflow, context);
          break;

        case "parallel":
          result = await executeParallelStep(
            step as ParallelStep,
            workflow,
            context
          );
          break;

        case "condition":
          result = await executeConditionStep(
            step as ConditionStep,
            workflow,
            context
          );
          break;

        case "map":
          result = await executeMapStep(step as MapStep, workflow, context);
          break;

        case "retry":
          result = await executeRetryStep(step as RetryStep, workflow, context);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      // Store step result in context
      context.steps[stepId] = result;

      // Run post-step hooks
      await instance.executeHook(
        "onWorkflowStepEnd",
        workflow,
        step,
        result,
        context
      );

      // Determine next step(s)
      if (step.next) {
        if (Array.isArray(step.next)) {
          // Multiple next steps (fanout)
          const promises = step.next.map((nextId) =>
            executeStep(nextId, workflow, context)
          );
          return await Promise.all(promises);
        } else if (typeof step.next === "string") {
          // Single next step
          return await executeStep(step.next, workflow, context);
        }
      }

      // No next step, return current result
      return result;
    } catch (error) {
      // Store error in context
      context.errors[stepId] = error;

      // Run error hook
      await instance.executeHook(
        "onWorkflowStepError",
        workflow,
        step,
        error,
        context
      );

      // Check for retry
      if (step.type === "task") {
        const taskStep = step as TaskStep;
        if (taskStep.config.retries && taskStep.config.retries > 0) {
          // Retry this step with decremented retries
          const retryStep: TaskStep = {
            ...taskStep,
            config: {
              ...taskStep.config,
              retries: taskStep.config.retries - 1,
            },
          };

          // Delay before retry if specified
          if (taskStep.config.retryDelay) {
            await new Promise((resolve) =>
              setTimeout(resolve, taskStep.config.retryDelay)
            );
          }

          // Retry the step
          return executeStep(
            stepId,
            {
              ...workflow,
              steps: {
                ...workflow.steps,
                [stepId]: retryStep,
              },
            },
            context
          );
        }
      }

      // No retry, propagate error
      throw error;
    }
  }

  // Execute a task step
  async function executeTaskStep(
    step: TaskStep,
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<any> {
    const { taskName, inputMap } = step.config;

    // Get the task
    const task = instance.tasks[taskName];
    if (!task) {
      throw new Error(`Task ${taskName} not found`);
    }

    // Check condition if present
    if (step.config.condition) {
      const shouldRun = await step.config.condition(context);
      if (!shouldRun) {
        // Skip this task
        return null;
      }
    }

    // Prepare input for the task
    let taskInput = context.input;

    if (inputMap) {
      taskInput = {};
      for (const [targetKey, sourceKey] of Object.entries(inputMap)) {
        if (typeof sourceKey === "function") {
          // Function source - call with context
          taskInput[targetKey] = await sourceKey(context);
        } else if (typeof sourceKey === "string") {
          // String source - lookup in context
          if (sourceKey.startsWith("steps.")) {
            // From a specific step
            const path = sourceKey.split(".");
            let value = context;
            for (const key of path) {
              value = value?.[key];
            }
            taskInput[targetKey] = value;
          } else {
            // From workflow input
            taskInput[targetKey] = context.input[sourceKey];
          }
        }
      }
    }

    // Execute the task
    const result = await task.execute(taskInput);

    // Apply output mapping
    if (step.config.outputMap) {
      for (const [resultKey, targetKey] of Object.entries(
        step.config.outputMap
      )) {
        // Set in the workflow context's output
        const value = result[resultKey];

        // Handle dot notation in targetKey
        if (targetKey.includes(".")) {
          const path = targetKey.split(".");
          let target = context.output;

          // Navigate to the correct object
          for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!target[key]) {
              target[key] = {};
            }
            target = target[key];
          }

          // Set the value at the leaf
          const leafKey = path[path.length - 1];
          target[leafKey] = value;
        } else {
          // Direct assignment
          context.output[targetKey] = value;
        }
      }
    } else {
      // No mapping, use the entire result
      Object.assign(context.output, result);
    }

    return result;
  }

  // Execute a parallel step
  async function executeParallelStep(
    step: ParallelStep,
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<any[]> {
    const { branches, waitForAll } = step.config;

    // Create promises for each branch
    const promises = branches.map((branchId) =>
      executeStep(branchId, workflow, context)
    );

    if (waitForAll) {
      // Wait for all branches to complete
      return await Promise.all(promises);
    } else {
      // Wait for any branch to complete
      return await Promise.race(promises);
    }
  }

  // Execute a condition step
  async function executeConditionStep(
    step: ConditionStep,
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<any> {
    const { condition, trueNext, falseNext } = step.config;

    // Evaluate the condition
    const result = await condition(context);

    // Follow the appropriate branch
    const nextStepId = result ? trueNext : falseNext;
    return await executeStep(nextStepId, workflow, context);
  }

  // Execute a map step
  async function executeMapStep(
    step: MapStep,
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<any[]> {
    const { items, iteratorTask, concurrency = 5 } = step.config;

    // Get items to iterate over
    let itemList: any[];

    if (typeof items === "string") {
      // Items come from context
      if (items.startsWith("steps.")) {
        // From a specific step
        const path = items.split(".");
        let value: any = context;
        for (const key of path) {
          value = value?.[key];
        }

        // Make sure value is an array
        if (!Array.isArray(value)) {
          throw new Error(
            `Map items from '${items}' must be an array, got ${typeof value}`
          );
        }

        itemList = value;
      } else {
        // From workflow input
        const value = context.input[items];

        // Make sure value is an array
        if (!Array.isArray(value)) {
          throw new Error(
            `Map items from input '${items}' must be an array, got ${typeof value}`
          );
        }

        itemList = value;
      }
    } else {
      // Direct array
      itemList = items;
    }

    if (!Array.isArray(itemList)) {
      throw new Error(`Map items must be an array, got ${typeof itemList}`);
    }

    // Helper function to process items in batches
    async function processBatch(items: any[], batchSize: number) {
      const results = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map((item) => {
          // Create a sub-context for this item
          const itemContext = {
            ...context,
            input: item,
            steps: { ...context.steps },
            output: {},
            errors: { ...context.errors },
            metadata: { ...context.metadata, parentContext: context },
          };

          return executeStep(iteratorTask, workflow, itemContext);
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      return results;
    }

    // Process items with the specified concurrency
    return await processBatch(itemList, concurrency);
  }

  // Execute a retry step
  async function executeRetryStep(
    step: RetryStep,
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<any> {
    const {
      stepId,
      maxRetries,
      delay = 1000,
      backoffFactor = 1,
      condition,
    } = step.config;

    // Function to retry with exponential backoff
    async function retry(attempts: number): Promise<any> {
      try {
        // Try to execute the step
        return await executeStep(stepId, workflow, context);
      } catch (error) {
        // Store the error
        context.errors[`${stepId}_attempt_${attempts}`] = error;

        // Check if we should retry
        if (attempts < maxRetries) {
          // Check custom condition if provided
          if (condition && !(await condition(error, attempts))) {
            throw error; // Don't retry if condition returns false
          }

          // Wait before retry with exponential backoff
          const waitTime = delay * Math.pow(backoffFactor, attempts);
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          // Retry
          return retry(attempts + 1);
        }

        // Max retries reached
        throw error;
      }
    }

    // Start with attempt 0
    return retry(0);
  }

  // Workflow decorator
  instance.decorateWorkflow = function (name: string, fn: Function) {
    // Add method to all workflow prototypes
    for (const workflowId in instance.workflows) {
      const workflow = instance.workflows[workflowId];
      workflow[name] = fn(workflow);
    }

    // Add to future workflows
    instance.addHook("onWorkflowRegister", (workflow: WorkflowInstance) => {
      workflow[name] = fn(workflow);
    });

    return instance;
  };

  // Register workflow hooks
  if (!instance.hooks.onWorkflowRegister) {
    instance.hooks.onWorkflowRegister = [];
  }

  if (!instance.hooks.onWorkflowStart) {
    instance.hooks.onWorkflowStart = [];
  }

  if (!instance.hooks.onWorkflowEnd) {
    instance.hooks.onWorkflowEnd = [];
  }

  if (!instance.hooks.onWorkflowError) {
    instance.hooks.onWorkflowError = [];
  }

  if (!instance.hooks.onWorkflowStepStart) {
    instance.hooks.onWorkflowStepStart = [];
  }

  if (!instance.hooks.onWorkflowStepEnd) {
    instance.hooks.onWorkflowStepEnd = [];
  }

  if (!instance.hooks.onWorkflowStepError) {
    instance.hooks.onWorkflowStepError = [];
  }

  // Return the enhanced instance
  return instance;
}
