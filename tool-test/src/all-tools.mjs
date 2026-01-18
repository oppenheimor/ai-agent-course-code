/**
 * 所有工具的集合
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

// 1. 读取文件工具
const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`[工具调用] read_file(${filePath}) - 成功读取 ${content.length} 字节`);
    return `文件内容:\n${content}`;
  },
  {
    name: 'read_file',
    description: '读取指定路径的文件内容',
    schema: z.object({
      filePath: z.string().describe('要读取的文件路径')
    })
  }
);

// 2. 写入文件工具
const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      // 先确保要写入文件目录存在，否则写入文件会报错
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`[工具调用] write_file(${filePath}) - 成功写入 ${content.length} 字节`);
      return `文件 ${filePath} 写入成功`;
    } catch(err) {
      console.error(`[工具调用] write_file(${filePath}) - 写入失败: ${err.message}`);
      return `文件 ${filePath} 写入失败: ${err.message}`;
    }
  },
  {
    name: 'write_file',
    description: '向指定路径写入文件内容，自动创建目录',
    schema: z.object({
      filePath: z.string().describe('要写入的文件路径'),
      content: z.string().describe('要写入的文件内容')
    })
  }
);

// 3. 执行命令工具（带实时输出）
const executeCommandTool = tool(
  async ({ command, workingDir }) => {
    const cwd = workingDir || process.cwd();
    console.log(`[工具调用] execute_command(${command}) - 工作目录 ${cwd}`);
    
    return new Promise((resolve, reject) => {
      // 解析命令和参数
      const [cmd, ...args] = command.split(' ');
      
      const child = spawn(cmd, args, {
        cwd,
        stdio: 'inherit',
        shell: true
      });
      
      let errorMsg = '';

      child.on('error', (err) => {
        errorMsg = err.message;
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`[工具调用] execute_command(${command}) - 命令执行成功（退出码 ${code}）`);
          const cwdInfo = workingDir ? `\n\n重要提示：命令在目录${workingDir}中执行成功，如果需要在项目目录中继续执行命令，请使用 workingDir：${workingDir} 参数，不要使用 cd 命令` : '';
          resolve(`命令 ${command} 执行成功 ${cwdInfo}（退出码 ${code}）`);
        } else {
          console.log(`[工具调用] execute_command(${command}) - 命令执行失败（退出码 ${code}）: ${errorMsg}`);
          reject(`[工具调用] execute_command(${command}) - 命令执行失败（退出码 ${code}）: ${errorMsg}`);
        }
      });
    });
  },
  {
    name: 'execute_command',
    description: '执行系统命令，支持指定工作目录，实时显示输出',
    schema: z.object({
      command: z.string().describe('要执行的 shell 命令'),
      workingDir: z.string().optional().describe('执行命令的工作目录，默认当前目录（推荐指定）')
    })
  }
);

// 4. 列出目录内容工具
const listDirectoryTool = tool(
  async ({ directoryPath }) => {
    try {
      const files = await fs.readdir(directoryPath);
      console.log(`[工具调用] list_directory(${directoryPath}) - 成功列出 ${files.length} 个文件/文件夹`);
      return `目录 ${directoryPath} 内容:\n${files.join('\n')}`;
    } catch(err) {
      console.error(`[工具调用] list_directory(${directoryPath}) - 列出目录内容失败: ${err.message}`);
      return `列出目录 ${directoryPath} 内容失败: ${err.message}`;
    }
  },
  {
    name: 'list_directory',
    description: '列出指定目录下的所有文件和文件夹',
    schema: z.object({
      directoryPath: z.string().describe('要列出内容的目录路径')
    })
  }
);

export {
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool,
};