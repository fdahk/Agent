import type { AgentTool, ToolExecutionResult, ToolSchema } from './types';

type WeatherInfo = {
  city: string;
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy';
  humidity: number;
};

const weatherDatabase: Record<string, WeatherInfo> = {
  北京: { city: '北京', temperature: 29, condition: 'sunny', humidity: 30 },
  上海: { city: '上海', temperature: 26, condition: 'rainy', humidity: 78 },
  杭州: { city: '杭州', temperature: 24, condition: 'cloudy', humidity: 62 },
  深圳: { city: '深圳', temperature: 31, condition: 'rainy', humidity: 82 },
  广州: { city: '广州', temperature: 30, condition: 'cloudy', humidity: 76 },
  成都: { city: '成都', temperature: 22, condition: 'rainy', humidity: 85 },
};

function success(data: unknown): ToolExecutionResult {
  return { ok: true, data };
}

function failure(error: string): ToolExecutionResult {
  return { ok: false, error };
}

// schema 既是给模型看的“工具说明书”，也是给 runtime 做参数校验的契约。
const getWeatherSchema: ToolSchema = {
  type: 'object',
  properties: {
    city: {
      type: 'string',
      description: '要查询天气的城市名称，例如北京、上海、深圳。',
    },
  },
  required: ['city'],
};

const buildPackingSchema: ToolSchema = {
  type: 'object',
  properties: {
    city: {
      type: 'string',
      description: '当前建议对应的城市名称。',
    },
    temperature: {
      type: 'number',
      description: '当前城市气温，单位摄氏度。',
    },
    condition: {
      type: 'string',
      description: '天气情况，只允许 sunny、cloudy、rainy 这三类。',
    },
  },
  required: ['city', 'temperature', 'condition'],
};

export function createDemoTools(): AgentTool[] {
  return [
    {
      name: 'lookup_mock_weather',
      description:
        '根据城市名称查询模拟天气。这个工具代表真实项目里的外部 API 调用。',
      inputSchema: getWeatherSchema,
      async execute(args) {
        // execute 是工具真正落地执行的地方。
        // 在真实项目里，这里是 HTTP 请求、数据库查询或 SDK 调用。
        const city = String(args.city ?? '').trim();
        const result = weatherDatabase[city];

        if (!result) {
          return failure(`暂不支持城市 ${city}，请改用北京、上海、杭州、深圳、广州、成都。`);
        }

        return success(result);
      },
    },
    {
      name: 'build_packing_list',
      description:
        '根据天气结果生成携带物品建议。这个工具代表真实项目里的业务规则引擎。',
      inputSchema: buildPackingSchema,
      async execute(args) {
        // 第二个工具不再查询外部事实，而是把前一个工具的结果转成业务建议，
        // 用来演示“事实获取”和“规则加工”可以拆成两个独立工具。
        const city = String(args.city ?? '').trim();
        const temperature = Number(args.temperature);
        const condition = String(args.condition ?? '').trim();

        const items = ['手机', '充电器'];

        if (temperature >= 28) {
          items.push('短袖', '防晒霜');
        } else if (temperature <= 18) {
          items.push('外套');
        } else {
          items.push('薄外套');
        }

        if (condition === 'rainy') {
          items.push('雨伞', '防水鞋');
        }

        if (condition === 'sunny') {
          items.push('太阳镜');
        }

        return success({
          city,
          items,
          summary: `${city} 当前更适合携带 ${items.join('、')}。`,
        });
      },
    },
  ];
}
