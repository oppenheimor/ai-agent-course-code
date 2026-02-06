import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import chalk from 'chalk';

const model = new ChatOpenAI({
  modelName: 'qwen-plus',
apiKey: "sk-DAhTDsAUjtfro7KT0AgYfQcJdU4FMJyaW88H3ezdsmaVumuf",
  temperature: 0,
  configuration: {
    baseURL: "https://api.302.ai/v1/chat/completions",
  },
});

// 定义 mcp 客户端
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      args: [
        '/Users/paulchess/Desktop/Home/github/ai-agent-course-code/tool-test/src/my-mcp-server.mjs'
      ]
    },
    'amap-maps-streamableHTTP': {
      "url": "https://mcp.amap.com/mcp?key=980bec0d8c6065863138702dbf418a5b"
    },
    'filesystem': {
      'command': 'npx',
      'args': [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        ...(process.env.ALLOWED_PATHS.split(',') || '')
      ]
    },
    'chrome-devtools': {
      'command': 'npx',
      'args': [
        '-y',
        'chrome-devtools-mcp@latest',
      ]
    }
  }
});

// 获取所有的 tool
const tools = await mcpClient.getTools();
// 将 tool 绑定到 model 上
const modelWithTools = model.bindTools(tools);

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new HumanMessage(query)
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen('⏳ 正在等待 AI 思考...'));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
    console.log(chalk.bgBlue(`🔍 工具调用: ${response.tool_calls.map(t => t.name).join(', ')}`));

    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find(t => t.name === toolCall.name);
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args);

        // 确保 content 是字符串类型
        let contentStr;
        if (typeof toolResult === 'string') {
          contentStr = toolResult;
        } else if (toolResult && toolResult.text) {
          // 如果返回对象有 text 字段，优先使用
          contentStr = toolResult.text;
        }

        messages.push(new ToolMessage({
          content: contentStr,
          tool_call_id: toolCall.id
        }));
      }
    }
  }

  return messages[messages.length - 1].content;
}

// await runAgentWithTools("北京南站附近的5个酒店，以及去的路线，路线规划生成文档保存到 /Users/paulchess/Desktop 的一个 md 文件");
await runAgentWithTools('北京南站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名');

await mcpClient.close();
