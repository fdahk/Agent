import type { AgentModel, ToolExecutionResult } from './types';

const supportedCities = ['北京', '上海', '杭州', '深圳', '广州', '成都'];

function extractCity(task: string): string {
  const matchedCity = supportedCities.find((city) => task.includes(city));
  return matchedCity ?? '北京';
}

// 运行时允许同一个工具被多次调用，这里取最后一次结果，
// 用来模拟 Agent 在多轮循环中“基于最新观察继续推理”。
function getLatestToolResult(
  toolResults: Record<string, ToolExecutionResult[]>,
  toolName: string,
): ToolExecutionResult | undefined {
  const results = toolResults[toolName];
  return results?.[results.length - 1];
}

/**
 * @description 基于模型，使用预设业务规则链，根据当前的工具结果和用户任务，决定下一步的行动。
 * @example
 */
export function createDemoModel(): AgentModel {
  return {
    async decide({ state }) {
      // 这里的模型没有自己联网或执行业务逻辑，而是先检查当前上下文里是否已有工具结果，
      // 再决定下一步是继续调用工具，还是生成最终回答。
      const weatherResult = getLatestToolResult(state.toolResults, 'lookup_mock_weather');
      const packingResult = getLatestToolResult(state.toolResults, 'build_packing_list');

      if (!weatherResult) {
        const city = extractCity(state.userTask);

        return {
          type: 'tool_call',
          toolName: 'lookup_mock_weather',
          arguments: { city },
          reasoning:
            '用户问题里包含出行建议，但缺少实时环境信息，所以先调用天气工具补充外部事实。',
        };
      }

      if (!weatherResult.ok) {
        return {
          type: 'final',
          content: `天气工具执行失败：${weatherResult.error ?? '未知错误'}`,
          reasoning: '外部事实获取失败时，运行时应尽快停止并向用户暴露错误，而不是继续幻觉生成。',
        };
      }

      // 第一轮工具调用成功后，把“外部事实”取出来，供后续业务规则工具继续消费。
      const weatherData = weatherResult.data as {
        city: string;
        temperature: number;
        condition: 'sunny' | 'cloudy' | 'rainy';
        humidity: number;
      };

      if (!packingResult) {
        // 这里演示 Agent 最典型的链式调用：
        // 上一个工具的输出，会成为下一个工具的输入。
        return {
          type: 'tool_call',
          toolName: 'build_packing_list',
          arguments: {
            city: weatherData.city,
            temperature: weatherData.temperature,
            condition: weatherData.condition,
          },
          reasoning:
            '已经拿到天气结果，下一步调用业务规则工具把外部事实转换成用户可读的行动建议。',
        };
      }

      if (!packingResult.ok) {
        return {
          type: 'final',
          content: `行李建议工具执行失败：${packingResult.error ?? '未知错误'}`,
          reasoning: '当某一步失败时，Agent 不应假装成功，而应输出结构化错误结果方便调试。',
        };
      }

      const packingData = packingResult.data as {
        city: string;
        items: string[];
        summary: string;
      };

      // 当事实查询和业务规则都完成后，模型才负责把结构化结果组织成最终自然语言答案。
      return {
        type: 'final',
        content: [
          `我已经通过工具链完成了这次任务。`,
          `${weatherData.city} 当前 ${weatherData.temperature}°C，天气为 ${weatherData.condition}，湿度 ${weatherData.humidity}%。`,
          packingData.summary,
          `最终建议：出门前优先准备 ${packingData.items.join('、')}。`,
        ].join('\n'),
        reasoning:
          '现在已经拿到外部事实和业务规则结果，可以结束循环并生成最终答案。',
      };
    },
  };
}
