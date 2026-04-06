import { useEffect, useRef } from 'react';

/** WebChatClient 构造参数（基于实际用法，SDK 无官方类型） */
interface CozeWebChatConfig {
  config?: { bot_id?: string };
  componentProps?: { title?: string };
  auth?: {
    type: string;
    token?: string;
    onRefreshToken?: () => string;
  };
}

// 这是 TypeScript 的全局类型扩展，不是当前文件私有的“局部类型”。
// 只要这个文件被 TS 编译并纳入项目，这里的声明就会合并到全局 `Window` 接口上，
// 这样在本文件或其他文件里访问 `window.CozeWebSDK` 时，类型检查都能识别它。
// 注意：它只影响类型系统，不会在运行时真正创建 `window.CozeWebSDK` 对象；
// 运行时对象仍然要靠后面动态加载的 script 脚本来挂载。
declare global {
  interface Window {
    CozeWebSDK: {
      WebChatClient: new (config: CozeWebChatConfig) => unknown;
    };
  }
}

export function CozeAgent() {
  const containerRef = useRef<HTMLDivElement>(null);
  console.log(import.meta.env.VITE_COZE_SECRET_TOKEN);
//   console.log(process.env.VITE_COZE_SECRET_TOKEN);
  useEffect(() => {
    // 加载Coze SDK
    const loadCozeSDK = () => {
      // 创建一个 <script> 元素，后面会给它设置 src 并插入到文档中，
      // 浏览器随后就会去下载并执行对应的 Coze SDK 脚本。
      const script = document.createElement('script');
      script.src = 'https://lf-cdn.coze.cn/obj/unpkg/flow-platform/chat-app-sdk/1.2.0-beta.10/libs/cn/index.js';
      script.onload = () => {
        console.log('Coze SDK 加载完成');
        // SDK加载完成后初始化
        if (window.CozeWebSDK) {
          try {
            new window.CozeWebSDK.WebChatClient({
              config: {
                bot_id: '7553978463314247690',
              },
              componentProps: {
                title: 'Coze AI Assistant',
              },
              auth: {
                type: 'token',
                token: import.meta.env.VITE_COZE_SECRET_TOKEN,
                onRefreshToken: function () {
                  return import.meta.env.VITE_COZE_SECRET_TOKEN;
                }
              }
            });
          } catch (error) {
            console.error('Coze WebChatClient 初始化失败:', error);
          }
        } else {
          console.error('CozeWebSDK 未找到');
        }
      };
      
      script.onerror = (error) => {
        console.error('Coze SDK 加载失败:', error);
      };
      // 把新建的 <script> 插入到当前文档的 <head> 中。
      // 一旦插入 DOM，浏览器就会开始请求 `script.src` 指向的脚本，
      // 脚本加载成功后会触发 `onload`，失败则触发 `onerror`。
      document.head.appendChild(script);
    };

    // 检查SDK是否已加载
    if (!window.CozeWebSDK) {
      loadCozeSDK();
    } else {
      // 如果已加载，直接初始化
      try {
        new window.CozeWebSDK.WebChatClient({
          config: {
            bot_id: '7553978463314247690',
          },
          componentProps: {
            title: 'Coze AI Assistant',
          },
          auth: {
            type: 'token',
            token: import.meta.env.VITE_COZE_SECRET_TOKEN || 'pat_S6rVinYi8IzaKMaJnPEUAEhCHEh9wEqOnjvOHAops5KQVu0IQDltKO3HNc1NRjBX',
            onRefreshToken: function () {
              return import.meta.env.VITE_COZE_SECRET_TOKEN || 'pat_S6rVinYi8IzaKMaJnPEUAEhCHEh9wEqOnjvOHAops5KQVu0IQDltKO3HNc1NRjBX';
            }
          }
        });
      } catch (error) {
        console.error('Coze WebChatClient 初始化失败（复用SDK）:', error);
      }
    }
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '600px' }}>
      {/* 这里之所以会“自动注入”，本质上不是 React 自动做的，
          而是 Coze SDK 在初始化 WebChatClient 后，会自己创建聊天界面的 DOM，
          再挂载到它约定的容器节点中。当前代码里虽然拿到了 containerRef，
          但并没有显式把它传给 SDK，所以最终挂载位置取决于 SDK 的默认实现。 */}
    </div>
  );
}