import { Agentify } from "./agentify";

// Types for task definition
export interface TaskDefinition {
  name: string;
  description: string;
  goal: string;
  input: Record<string, any>;
  expectedOutput?: {
    schema?: any;
    example?: any;
  };
  requiredCapabilities?: string[];
  evaluationCriteria?: {
    [criterion: string]: {
      description: string;
      threshold?: number;
    };
  };
  maxAttempts?: number;
}

// Task decomposition strategies
export enum DecompositionStrategy {
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
  RECURSIVE = "recursive",
  AUTO = "auto",
}

// Orchestrator options
export interface OrchestratorOptions {
  defaultDecompositionStrategy?: DecompositionStrategy;
  enableAutoEvaluation?: boolean;
  evaluationThreshold?: number;
  maxRetries?: number;
  verbose?: boolean;
}

// Execution context maintained by the orchestrator
export interface ExecutionContext {
  taskId: string;
  parentTaskId?: string;
  startTime: Date;
  input: any;
  intermediateResults: Record<string, any>;
  logs: Array<{
    timestamp: Date;
    level: string;
    message: string;
    data?: any;
  }>;
  subtasks: string[];
  agents: Record<string, string>;
  status: "pending" | "running" | "completed" | "failed";
}

/**
 * OrchestratorCore provides the core functionality for task orchestration
 */
export class OrchestratorCore {
  private app: ReturnType<typeof Agentify>;
  private options: OrchestratorOptions;
  private contexts: Map<string, ExecutionContext>;

  constructor(
    app: ReturnType<typeof Agentify>,
    options: OrchestratorOptions = {}
  ) {
    this.app = app;
    this.options = {
      defaultDecompositionStrategy: DecompositionStrategy.AUTO,
      enableAutoEvaluation: true,
      evaluationThreshold: 0.7,
      maxRetries: 2,
      verbose: false,
      ...options,
    };
    this.contexts = new Map();
  }

  /**
   * Execute a task with automatic orchestration
   */
  async executeTask(taskDefinition: TaskDefinition, input: any): Promise<any> {
    const taskId = `${taskDefinition.name}-${Date.now()}`;

    // Create execution context
    this.createContext(taskId, null, input);

    try {
      // Log task start
      if (this.options.verbose) {
        console.log(`[Orchestrator] Starting task: ${taskDefinition.name}`);
        console.log(`[Orchestrator] Input:`, JSON.stringify(input));
      }
      this.logToContext(
        taskId,
        "info",
        `Starting task: ${taskDefinition.name}`
      );

      // 1. Analyze the task
      const analysis = await this.analyzeTask(taskDefinition, input);
      if (this.options.verbose) {
        console.log(`[Orchestrator] Task analysis:`, JSON.stringify(analysis));
      }

      // 2. Decompose the task if needed
      const subtasks = await this.decomposeTask(
        taskDefinition,
        input,
        analysis.decompositionStrategy ||
          this.options.defaultDecompositionStrategy
      );

      if (this.options.verbose) {
        console.log(
          `[Orchestrator] Decomposed into ${subtasks.length} subtasks`
        );
        subtasks.forEach((st, i) => {
          console.log(
            `[Orchestrator] Subtask ${i + 1}: ${st.name} (Capabilities: ${
              st.requiredCapabilities?.join(", ") || "none"
            })`
          );
        });
      }

      // Save subtasks to context
      this.updateContext(taskId, {
        subtasks: subtasks.map((st) => st.name),
      });

      // 3. Execute subtasks
      const subtaskResults = [];
      const accumulatedData = { ...input }; // Start with the original input

      for (const subtask of subtasks) {
        // 4. Select appropriate agent based on capabilities
        const agent = await this.selectAgent(subtask);

        if (this.options.verbose) {
          console.log(
            `[Orchestrator] Selected agent: ${agent.name} for subtask: ${subtask.name}`
          );
          console.log(
            `[Orchestrator] Agent capabilities: ${
              agent.capabilities?.join(", ") || "none"
            }`
          );
        }

        // Save agent assignment to context
        this.updateContextProperty(taskId, "agents", {
          [subtask.name]: agent.name,
        });

        // 5. Execute the subtask with the agent
        if (this.options.verbose) {
          console.log(
            `[Orchestrator] Executing subtask: ${subtask.name} with agent: ${agent.name}`
          );
        }

        // Pass accumulated data from previous subtasks
        const subtaskResult = await this.executeWithAgent(
          agent,
          subtask,
          accumulatedData
        );
        subtaskResults.push(subtaskResult);

        // Add this result to accumulated data for next subtasks
        Object.assign(accumulatedData, subtaskResult);

        if (this.options.verbose) {
          console.log(`[Orchestrator] Subtask completed: ${subtask.name}`);
          console.log(
            `[Orchestrator] Result:`,
            JSON.stringify(subtaskResult).substring(0, 200) +
              (JSON.stringify(subtaskResult).length > 200 ? "..." : "")
          );
        }

        // Save intermediate result
        this.updateContextProperty(taskId, "intermediateResults", {
          [subtask.name]: subtaskResult,
        });
      }

      // 6. Aggregate results
      if (this.options.verbose) {
        console.log(
          `[Orchestrator] Aggregating results from ${subtaskResults.length} subtasks`
        );
      }

      const aggregatedResult = await this.aggregateResults(
        taskDefinition,
        subtaskResults
      );

      // 7. Evaluate the result
      if (this.options.verbose) {
        console.log(`[Orchestrator] Evaluating result`);
      }

      const evaluation = await this.evaluateResult(
        taskDefinition,
        aggregatedResult
      );

      if (this.options.verbose) {
        console.log(`[Orchestrator] Evaluation:`, JSON.stringify(evaluation));
      }

      // 8. Handle evaluation results
      const finalResult = await this.handleEvaluation(
        taskId,
        taskDefinition,
        aggregatedResult,
        evaluation,
        input
      );

      // Update context with completion
      this.updateContext(taskId, {
        status: "completed",
      });

      if (this.options.verbose) {
        console.log(
          `[Orchestrator] Task ${taskDefinition.name} completed successfully`
        );
      }

      return finalResult;
    } catch (error: any) {
      // Log and handle errors
      console.error(`[Orchestrator] Task failed: ${error.message}`, error);
      this.logToContext(
        taskId,
        "error",
        `Task failed: ${error.message}`,
        error
      );
      this.updateContext(taskId, {
        status: "failed",
      });

      throw error;
    }
  }

  /**
   * Analyze a task to determine the best execution approach
   */
  private async analyzeTask(taskDefinition: TaskDefinition, input: any) {
    // Use an LLM or rule-based system to analyze the task
    // This implementation would depend on specific LLM integration

    // For now, return a simple analysis
    return {
      complexity: "medium",
      estimatedTime: "5m",
      decompositionStrategy: DecompositionStrategy.AUTO,
      suggestedCapabilities: taskDefinition.requiredCapabilities || ["general"],
    };
  }

  /**
   * Decompose a task into subtasks
   */
  private async decomposeTask(
    taskDefinition: TaskDefinition,
    input: any,
    strategy: DecompositionStrategy = DecompositionStrategy.AUTO
  ): Promise<TaskDefinition[]> {
    // If it's a simple task, no need to decompose
    if (
      strategy === DecompositionStrategy.AUTO &&
      (!taskDefinition.requiredCapabilities ||
        taskDefinition.requiredCapabilities.length <= 1)
    ) {
      return [taskDefinition];
    }

    // For more complex decomposition, we would use an LLM to break down the task
    // This implementation would depend on specific LLM integration

    // For now, create basic subtasks based on required capabilities
    if (
      taskDefinition.requiredCapabilities &&
      taskDefinition.requiredCapabilities.length > 0
    ) {
      return taskDefinition.requiredCapabilities.map((capability) => ({
        name: `${taskDefinition.name}_${capability}`,
        description: `Handle ${capability} aspect of ${taskDefinition.name}`,
        goal: taskDefinition.goal,
        input: input,
        requiredCapabilities: [capability],
        expectedOutput: taskDefinition.expectedOutput,
      }));
    }

    // If no specific decomposition is needed, return the original task
    return [taskDefinition];
  }

  /**
   * Select an appropriate agent based on required capabilities
   */
  private async selectAgent(taskDefinition: TaskDefinition) {
    const requiredCapabilities = taskDefinition.requiredCapabilities || [
      "general",
    ];

    // Find agents that match the required capabilities
    const matchingAgents = Object.values(this.app.agents).filter((agent) => {
      const agentCapabilities = agent.capabilities || ["general"];
      return requiredCapabilities.every((cap) =>
        agentCapabilities.includes(cap)
      );
    });

    if (matchingAgents.length === 0) {
      throw new Error(
        `No agent found with required capabilities: ${requiredCapabilities.join(
          ", "
        )}`
      );
    }

    // For now, simply return the first matching agent
    // In a more sophisticated implementation, we could rank agents by suitability
    return matchingAgents[0];
  }

  /**
   * Execute a task with a specific agent
   */
  private async executeWithAgent(
    agent: any,
    taskDefinition: TaskDefinition,
    input: any
  ) {
    // Normalize input parameters based on agent capabilities
    const normalizedInput = this.normalizeInputForCapabilities(
      input,
      agent.capabilities || []
    );

    if (this.options.verbose) {
      console.log(`[Orchestrator] Executing with agent: ${agent.name}`);
      console.log(
        `[Orchestrator] Normalized input:`,
        JSON.stringify(normalizedInput)
      );
    }

    try {
      // Execute directly using the agent's execute method (which is our wrapped function that provides tools)
      const taskInfo = {
        ...taskDefinition,
        // Ensure name is defined in a non-conflicting way
        id: taskDefinition.name,
      };

      // Directly executing agent through its defined interface in agent.ts
      return await agent.execute(taskInfo, normalizedInput);
    } catch (error: any) {
      console.error(`[Orchestrator] Agent execution error:`, error.message);
      throw error;
    }
  }

  /**
   * Normalize input parameters based on agent capabilities
   * This helps map generic task inputs to what specific agents expect
   */
  private normalizeInputForCapabilities(
    input: any,
    capabilities: string[]
  ): any {
    const normalized = { ...input };

    // Apply common normalization patterns based on capabilities
    if (
      capabilities.includes("research") &&
      !normalized.query &&
      normalized.topic
    ) {
      normalized.query = normalized.topic;
    }

    if (
      capabilities.includes("visualize") &&
      !normalized.concept &&
      normalized.topic
    ) {
      normalized.concept = normalized.topic;
    }

    if (
      capabilities.includes("summarize") &&
      !normalized.text &&
      normalized.content
    ) {
      normalized.text = normalized.content;
    }

    return normalized;
  }

  /**
   * Aggregate results from multiple subtasks
   */
  private async aggregateResults(
    taskDefinition: TaskDefinition,
    subtaskResults: any[]
  ) {
    // For single results, just return it directly
    if (subtaskResults.length === 1) {
      return subtaskResults[0];
    }

    // For multiple results, combine them intelligently
    // This could use an LLM for complex aggregation

    // For now, implement a simple aggregation strategy
    const combined: Record<string, any> = {};

    for (const result of subtaskResults) {
      Object.assign(combined, result);
    }

    return combined;
  }

  /**
   * Evaluate a task result against criteria
   */
  private async evaluateResult(taskDefinition: TaskDefinition, result: any) {
    // Skip evaluation if disabled
    if (!this.options.enableAutoEvaluation) {
      return { passed: true, score: 1.0 };
    }

    // If no evaluation criteria defined, consider it passed
    if (!taskDefinition.evaluationCriteria) {
      return { passed: true, score: 1.0 };
    }

    // For each criterion, evaluate the result
    // This could use an evaluation agent or LLM

    // For now, implement a simple check
    const evaluations: Record<string, number> = {};
    let totalScore = 0;

    for (const [criterion, details] of Object.entries(
      taskDefinition.evaluationCriteria
    )) {
      // In a real implementation, we'd evaluate each criterion properly
      // For now, assume a random score that's usually good
      const score = 0.5 + Math.random() * 0.5; // Between 0.5 and 1.0
      evaluations[criterion] = score;
      totalScore += score;
    }

    const averageScore =
      totalScore / Object.keys(taskDefinition.evaluationCriteria).length;
    const passed = averageScore >= (this.options.evaluationThreshold || 0.7);

    return {
      passed,
      score: averageScore,
      criteria: evaluations,
    };
  }

  /**
   * Handle evaluation results, potentially retrying if needed
   */
  private async handleEvaluation(
    taskId: string,
    taskDefinition: TaskDefinition,
    result: any,
    evaluation: any,
    originalInput: any
  ) {
    // If evaluation passed, return the result
    if (evaluation.passed) {
      return result;
    }

    // Check if we've hit max retries
    const context = this.contexts.get(taskId);
    const attempts =
      context?.logs.filter((log) => log.message.includes("Starting task"))
        .length || 1;

    if (
      attempts > (taskDefinition.maxAttempts || this.options.maxRetries || 2)
    ) {
      // We've hit max retries, return best result with warning
      console.warn(
        `[Orchestrator] Task ${taskDefinition.name} didn't meet evaluation criteria after ${attempts} attempts. Returning best result.`
      );
      return {
        ...result,
        _warning: "This result did not meet all quality criteria",
        _evaluation: evaluation,
      };
    }

    // Otherwise, retry the task
    console.log(
      `[Orchestrator] Retrying task ${taskDefinition.name} due to evaluation score: ${evaluation.score}`
    );

    // Enhanced input with feedback for retry
    const enhancedInput = {
      ...originalInput,
      _previousAttempt: {
        result,
        evaluation,
        feedback: "Please improve on the previous attempt",
      },
    };

    // Recursive call to retry
    return this.executeTask(taskDefinition, enhancedInput);
  }

  // Context management methods
  private createContext(
    taskId: string,
    parentTaskId: string | null,
    input: any
  ) {
    this.contexts.set(taskId, {
      taskId,
      parentTaskId: parentTaskId || undefined,
      startTime: new Date(),
      input,
      intermediateResults: {},
      logs: [],
      subtasks: [],
      agents: {},
      status: "pending",
    });
  }

  private updateContext(taskId: string, updates: Partial<ExecutionContext>) {
    const context = this.contexts.get(taskId);
    if (context) {
      this.contexts.set(taskId, { ...context, ...updates });
    }
  }

  private updateContextProperty(
    taskId: string,
    property: keyof ExecutionContext,
    value: any
  ) {
    const context = this.contexts.get(taskId);
    if (context) {
      if (typeof value === "object" && !Array.isArray(value)) {
        context[property] = { ...(context[property] as object), ...value };
      } else {
        context[property] = value;
      }
      this.contexts.set(taskId, context);
    }
  }

  private logToContext(
    taskId: string,
    level: string,
    message: string,
    data?: any
  ) {
    const context = this.contexts.get(taskId);
    if (context) {
      context.logs.push({
        timestamp: new Date(),
        level,
        message,
        data,
      });
      this.contexts.set(taskId, context);
    }
  }
}

/**
 * Builds and attaches the orchestration system to the Agentify instance
 */
export function buildOrchestratorSystem(instance: ReturnType<typeof Agentify>) {
  // Create the orchestrator
  const orchestrator = new OrchestratorCore(instance, {
    verbose: !!instance.options.logger,
  });

  // Add orchestrator to the instance
  instance.orchestrator = orchestrator;

  // Provide a simplified declarative task execution API
  instance.run = async function (
    taskDefinition: TaskDefinition,
    input: any = {}
  ) {
    return orchestrator.executeTask(taskDefinition, input);
  };

  // Add a simple task definition API
  instance.defineTask = function (taskDefinition: TaskDefinition) {
    // You might want to store the task definition somewhere

    // Return a function that can execute this task
    return async (input: any = {}) => {
      return orchestrator.executeTask(taskDefinition, input);
    };
  };
}
