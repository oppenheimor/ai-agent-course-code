import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { SystemMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import fs from 'node:fs/promises';

// 第一步：使用 @langchain/openai 的 ChatOpenAI 创建 model 实例
const model = new ChatOpenAI({
  modelName: "qwen-coder-turbo",
  apiKey: "sk-DAhTDsAUjtfro7KT0AgYfQcJdU4FMJyaW88H3ezdsmaVumuf",
  // 让 ai 创造性为 0，严格按照指令来做事
  temperature: 0,
  configuration: {
    baseURL: "https://api.302.ai/v1/chat/completions",
  },
});

// 第二步：使用 @langchain/core 的 tool 创建工具
// 这里定义了一个读取文件的工具
/**
 * tool 第一个参数：具体的函数实现；第二个参数：工具的描述
 */
const readFileTool = tool(async ({ filePath }) => {
  const content = await fs.readFile(filePath, 'utf8');
  console.log(`[工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
  return `文件内容：\n${content}`;
}, {
  name: 'read_file',
  description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。',
  schema: z.object({
    filePath: z.string().describe('要读取的文件路径'),
  })
});

// 第三步：把定义的工具塞到 tools 数组中
const tools = [
  readFileTool
];

// 第四步：使用 model.bindTools 绑定工具，得到新的 modelWithTools 实例
const modelWithTools = model.bindTools(tools);

// 第五步：定义 messages 数组，初始包含 SystemMessage 和 HumanMessage
// SystemMessage：告诉模型身份、工作流程、可用工具
// HumanMessage：告诉模型用户的具体请求，这里会告诉模型具体要分析的文件路径
const messages = [
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释，包括但不限于代码结构、功能实现、潜在问题等

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）`),
  new HumanMessage('请读取 src/hello-langchain.mjs 文件内容并解释代码')
];

// 第六步：先进行第一轮模型调用，检查是否有工具调用
let response = await modelWithTools.invoke(messages);

// 第七步：把第一轮的回复加入 messages
messages.push(response);

// 第八步：处理工具调用
while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`\n[检测到] ${response.tool_calls.length} 个工具调用`);

  // 并发执行工具调用
  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find(t => t.name === toolCall.name);
      if (!tool) {
        return `错误：未找到工具 ${toolCall.name}`;
      }
      console.log(`[调用工具] ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`);
      try {
        // 执行工具函数, 得到结果
        const result = await tool.invoke(toolCall.args);
        return result;
      } catch (err) {
        return `错误: ${err.message}`;
      }
    })
  );

  // 把每一个工具的 id 及其调用结果封装为 ToolMessage 传给传入 messages
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(new ToolMessage({
      tool_call_id: toolCall.id,
      content: toolResults[index]
    }));
  });

  // 拿到工具调用结果，再调一次模型
  response = await modelWithTools.invoke(messages);
  messages.push(response);
}

console.log('\n[最终回复]');
console.log(response.content);