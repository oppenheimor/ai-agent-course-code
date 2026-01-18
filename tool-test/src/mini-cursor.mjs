import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { executeCommandTool, readFileTool, writeFileTool, listDirectoryTool } from './all-tools.mjs';
import { SystemMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import chalk from 'chalk';

// 创建模型实例
const model = new ChatOpenAI({
  modelName: "qwen-plus",
  apiKey: "sk-DAhTDsAUjtfro7KT0AgYfQcJdU4FMJyaW88H3ezdsmaVumuf",
  configuration: {
    baseURL: "https://api.302.ai/v1",
  }
});

// 创建工具
const tools = [
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool
];

// 将工具绑定到模型
const modelWithTools = model.bindTools(tools);

/**
 * Agent 执行函数
 * @param {*} query 用户问句
 * @param {*} maxIterations 最大迭代次数
 */
async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(`你是一个项目管理助手，使用工具完成任务。

当前工作目录：${process.cwd()}

工具：
1. read_file: 读取文件内容
2. write_file: 向指定路径写入文件内容，自动创建目录
3. execute_command: 执行系统命令，支持指定工作目录，实时显示输出
4. list_directory: 列出目录下的文件和子目录

重要规则 - execute_command：
1. workingDir 参数会自定切换到指定目录
2. 当使用 workingDir 时，绝对不要在 command 中使用 cd 命令
3. 错误实例：{ command: "cd react-todo-app && pnpm install", workingDir: "react-todo-app" }
这是错误的！因为 workingDir 已经在 react-todo-app 目录，再 cd react-todo-app 会找不到目录
4. 正确实例：{ command: "pnpm install", workingDir: "react-todo-app" }
这样就对了！workingDir 已经切换到 react-todo-app，直接执行命令即可

回复要简洁，只说做了什么。
`),
    new HumanMessage(query),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.green(`⏳ 正在等待 AI 思考...（第 ${i + 1} 轮）`));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    console.log(chalk.yellow(`第 ${i + 1} 轮 AI 回复内容:', ${response.content}`));
    console.log(chalk.yellow(`第 ${i + 1} 轮 AI 回复工具调用数量:', ${response.tool_calls.length}`));
    response.tool_calls && response.tool_calls.forEach(toolCall => {
      console.log(chalk.yellow(`工具调用: ${toolCall.name}(${toolCall.args})`));
    });
    

    // 检查是否有工具调用
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log('✅ 发现工具调用:', response.tool_calls);
      // 处理工具调用...
      for (const toolCall of response.tool_calls) {
        const tool = tools.find(t => t.name === toolCall.name);
        if (tool) {
          const toolResult = await tool.invoke(toolCall.args);
          messages.push(new ToolMessage({
            content: toolResult,
            tool_call_id: toolCall.id,
          }));
        }
      }
    } else {
      console.log('✅ 没有工具调用，任务完成');
      break;
    }
  }

  return messages[messages.length - 1].content;
}

const case1 = `
创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\\nn" | pnpm create vite react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
  - 添加、删除、编辑、标记完成
  - 分类筛选（全部/进行中/已完成）
  - 统计信息显示
  - localStorage 数据持久化
3. 添加复杂样式：
  - 渐变背景（蓝到紫）
  - 卡片阴影、圆角
  - 悬停效果
4. 添加动画：
  - 添加/删除时的过渡动画
  - 使用 CSS transitions
5. 列出目录确认

注意：使用 pnpm, 功能要完整，样式要美观，要有动画效果

之后在 react-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器
`;

try {
  await runAgentWithTools(case1);
} catch(err) {
  console.error(`\n❌ 错误: ${err.message}\n`);
}
