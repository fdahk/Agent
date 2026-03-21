export type SchemaPropertyType = 'string' | 'number' | 'boolean';

export type ToolSchemaProperty = {
  type: SchemaPropertyType;
  description: string;
};

export type ToolSchema = {
  type: 'object';
  properties: Record<string, ToolSchemaProperty>;
  required: string[];
};

// 所有工具都通过统一结果结构返回，runtime 才能用同一套逻辑处理成功和失败分支。
export type ToolExecutionResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

// AgentTool 描述的是“一个可被模型选择调用的能力单元”：
// 名字和 schema 面向模型，execute 面向真实执行。
export type AgentTool = {
  name: string;
  description: string;
  inputSchema: ToolSchema;
  execute: (args: Record<string, unknown>) => Promise<ToolExecutionResult>;
};

export type AgentMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
};

export type AgentToolCallDecision = {
  type: 'tool_call';
  toolName: string;
  arguments: Record<string, unknown>;
  reasoning: string;
};

export type AgentFinalDecision = {
  type: 'final';
  content: string;
  reasoning: string;
};

export type AgentDecision = AgentToolCallDecision | AgentFinalDecision;

export type AgentTraceStatus = 'running' | 'success' | 'error';

// trace 是非常关键的一层，它把 Agent 的黑盒过程展开成可观测的步骤时间线。
export type AgentTraceStep = {
  id: number;
  kind: 'model' | 'tool' | 'error';
  title: string;
  detail: string;
  status: AgentTraceStatus;
  payload?: unknown;
};

// runtime state 是 messages 之外的结构化状态容器，用来保存循环控制信息和工具执行历史。
export type AgentRuntimeState = {
  userTask: string;
  currentStep: number;
  maxSteps: number;
  toolResults: Record<string, ToolExecutionResult[]>;
};

export type AgentRunResult = {
  finalAnswer: string;
  trace: AgentTraceStep[];
};

// 这个示例把“模型”抽象成一个纯决策接口：
// 输入上下文，输出下一步动作；至于动作怎么执行，由 runtime 负责。
export type AgentModel = {
  decide: (input: {
    messages: AgentMessage[];
    availableTools: Pick<AgentTool, 'name' | 'description' | 'inputSchema'>[];
    state: AgentRuntimeState;
  }) => Promise<AgentDecision>;
};
