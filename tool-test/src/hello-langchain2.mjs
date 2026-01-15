import 'dotenv/config';
import z from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools'
import fs from 'node:fs/promises';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || "qwen-coder-turbo",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  }
});

const readFileTool = tool(async ({ filePath }) => {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}, {
  name: "read_file",
  description: "读取文件内容",
  schema: z.object({
    filePath: z.string().describe("要读取的文件路径"),
  }),
});

const tools = [
  readFileTool
];

const modelWithTools = model.bindTools(tools);

const messages = [
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释，包括但不限于代码结构、功能实现、潜在问题等

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）`),
  new HumanMessage('请读取 src/hello-langchain.mjs 文件内容并解释代码')
]

let response = await modelWithTools.invoke(messages);

messages.push(response)

while(response.tool_calls && response.tool_calls.length > 0) {
  console.log(`\n[检测到] ${response.tool_calls.length} 个工具调用`);

  const toolResults = await Promise.all(
    response.tool_calls.map(async toolCall => {
      const tool = tools.find(t => t.name === toolCall.name);
      if (!tool) {
        return '没检测到工具调用'
      }

      console.log(`检测到工具, 名称为 ${toolCall.name}, 参数为 ${JSON.stringify(toolCall.args)}`);

      try {
        const result = await tool.invoke(toolCall.args);
        return result;
      } catch(err) {
        return `工具 ${toolCall.name} 调用失败, 错误信息为 ${err.message}`
      }
    })
  )

  response.tool_calls.forEach((toolCall, index) => {
    messages.push(new ToolMessage({
      tool_call_id: toolCall.id,
      content: toolResults[index]
    }))
  })
  
  response = await modelWithTools.invoke(messages);
  
  // 每次有 response 了都得把它塞到 messages 里去
  messages.push(response);
}

console.log('最终回复');
console.log(response.content);