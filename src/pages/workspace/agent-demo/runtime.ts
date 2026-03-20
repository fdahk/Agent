import type {
  AgentDecision,
  AgentMessage,
  AgentModel,
  AgentRunResult,
  AgentRuntimeState,
  AgentTool,
  AgentTraceStep,
} from './types';

type RunAgentOptions = {
  task: string;
  model: AgentModel;
  tools: AgentTool[];
  maxSteps?: number;
  onTrace?: (trace: AgentTraceStep[]) => void;
};

// trace 会被 UI 持续消费，所以这里做浅拷贝，避免外部误持有同一个可变数组引用。
function cloneTrace(trace: AgentTraceStep[]) {
  return trace.map((item) => ({ ...item }));
}

// 统一的 trace 记录入口：运行时、模型、工具、错误都通过这里落到时间线里。
function pushTrace(
  trace: AgentTraceStep[],
  step: Omit<AgentTraceStep, 'id'>,
  onTrace?: (trace: AgentTraceStep[]) => void,
) {
  trace.push({
    id: trace.length + 1,
    ...step,
  });
  onTrace?.(cloneTrace(trace));
}

// 这个示例自己实现了一层极简 schema 校验，用来演示：
// “模型决定调用什么工具”之后，运行时仍然要像真实 Agent 平台一样做参数兜底。
function validateToolArguments(
  tool: AgentTool,
  args: Record<string, unknown>,
): { ok: true } | { ok: false; error: string } {
  for (const field of tool.inputSchema.required) {
    if (!(field in args)) {
      return { ok: false, error: `工具 ${tool.name} 缺少必填字段 ${field}` };
    }
  }

  for (const [field, property] of Object.entries(tool.inputSchema.properties)) {
    const value = args[field];

    if (value === undefined) {
      continue;
    }

    if (property.type === 'number' && typeof value !== 'number') {
      return { ok: false, error: `字段 ${field} 需要 number，实际为 ${typeof value}` };
    }

    if (property.type === 'string' && typeof value !== 'string') {
      return { ok: false, error: `字段 ${field} 需要 string，实际为 ${typeof value}` };
    }

    if (property.type === 'boolean' && typeof value !== 'boolean') {
      return { ok: false, error: `字段 ${field} 需要 boolean，实际为 ${typeof value}` };
    }
  }

  return { ok: true };
}

function createToolMap(tools: AgentTool[]) {
  return new Map(tools.map((tool) => [tool.name, tool]));
}

// 这里模拟真实 LLM Agent 的上下文：
// system 负责约束行为，user 提供任务，后续 assistant / tool 会持续追加到同一上下文。
function createInitialMessages(task: string): AgentMessage[] {
  return [
    {
      role: 'system',
      content:
        '你是一个学习型 Agent 模型。你需要优先调用工具拿到外部事实，再根据工具结果生成最终结论。',
    },
    {
      role: 'user',
      content: task,
    },
  ];
}

// 运行时会把“模型的决策”也写回消息历史。
// 这样下一轮模型决策时，能看到自己上一轮是如何行动的。
function appendModelDecision(messages: AgentMessage[], decision: AgentDecision) {
  if (decision.type === 'final') {
    messages.push({
      role: 'assistant',
      content: decision.content,
    });
    return;
  }

  messages.push({
    role: 'assistant',
    content: JSON.stringify({
      tool_name: decision.toolName,
      arguments: decision.arguments,
    }),
  });
}

export async function runDemoAgent({
  task,
  model,
  tools,
  maxSteps = 6,
  onTrace,
}: RunAgentOptions): Promise<AgentRunResult> {
  const trace: AgentTraceStep[] = [];
  const messages = createInitialMessages(task);
  const toolMap = createToolMap(tools);
  // state 是运行时额外维护的“结构化世界状态”。
  // 和 messages 不同，它存历史工具结果、当前步数这类程序化信息。
  const state: AgentRuntimeState = {
    userTask: task,
    currentStep: 0,
    maxSteps,
    toolResults: {},
  };

  pushTrace(
    trace,
    {
      kind: 'model',
      status: 'success',
      title: '初始化运行时',
      detail: '已装载 system prompt、用户任务、工具定义和最大步数限制。',
      payload: {
        messages,
        toolNames: tools.map((tool) => tool.name),
        maxSteps,
      },
    },
    onTrace,
  );

  for (let step = 1; step <= maxSteps; step += 1) {
    state.currentStep = step;

    // 模型只负责“决策下一步做什么”，真正的工具调度、校验和错误处理都由 runtime 接管。
    const decision = await model.decide({
      messages,
      availableTools: tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
      state,
    });

    appendModelDecision(messages, decision);

    pushTrace(
      trace,
      {
        kind: 'model',
        status: 'success',
        title: `第 ${step} 步：模型决策`,
        detail: decision.reasoning,
        payload: decision,
      },
      onTrace,
    );

    if (decision.type === 'final') {
      return {
        finalAnswer: decision.content,
        trace,
      };
    }

    const tool = toolMap.get(decision.toolName);

    if (!tool) {
      const error = `未注册工具 ${decision.toolName}`;
      pushTrace(
        trace,
        {
          kind: 'error',
          status: 'error',
          title: `第 ${step} 步：工具路由失败`,
          detail: error,
        },
        onTrace,
      );
      throw new Error(error);
    }

    const validationResult = validateToolArguments(tool, decision.arguments);

    if (!validationResult.ok) {
      pushTrace(
        trace,
        {
          kind: 'error',
          status: 'error',
          title: `第 ${step} 步：参数校验失败`,
          detail: validationResult.error,
          payload: decision.arguments,
        },
        onTrace,
      );
      throw new Error(validationResult.error);
    }

    pushTrace(
      trace,
      {
        kind: 'tool',
        status: 'running',
        title: `第 ${step} 步：执行工具 ${tool.name}`,
        detail: tool.description,
        payload: decision.arguments,
      },
      onTrace,
    );

    const toolResult = await tool.execute(decision.arguments);
    // toolResults 按工具名归档为数组，而不是只保留最后一次结果，
    // 这样模型既可以取最后一次结果，也保留了多轮调用同一工具的扩展空间。
    state.toolResults[tool.name] = [...(state.toolResults[tool.name] ?? []), toolResult];

    // 工具结果被“回注”到 messages 后，下一轮模型就能像读取函数返回值一样读取工具输出。
    messages.push({
      role: 'tool',
      name: tool.name,
      content: JSON.stringify(toolResult),
    });

    pushTrace(
      trace,
      {
        kind: toolResult.ok ? 'tool' : 'error',
        status: toolResult.ok ? 'success' : 'error',
        title: `第 ${step} 步：工具 ${tool.name} 返回`,
        detail: toolResult.ok
          ? '工具执行成功，结果已回注到上下文，模型可继续下一轮决策。'
          : toolResult.error ?? '工具执行失败',
        payload: toolResult,
      },
      onTrace,
    );

  }

  const error = `运行超过最大步数 ${maxSteps}，已触发停止条件。`;
  pushTrace(
    trace,
    {
      kind: 'error',
      status: 'error',
      title: '运行终止',
      detail: error,
    },
    onTrace,
  );
  throw new Error(error);
}
