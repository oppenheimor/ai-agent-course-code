import 'cheerio';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import chalk from 'chalk';

const model = new ChatOpenAI({
  model: 'qwen-plus',
  apiKey: "sk-DAhTDsAUjtfro7KT0AgYfQcJdU4FMJyaW88H3ezdsmaVumuf",
  temperature: 0,
  configuration: {
    baseURL: "https://api.302.ai/v1/chat/completions",
  },
});

const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-ada-002',
  apiKey: "sk-DAhTDsAUjtfro7KT0AgYfQcJdU4FMJyaW88H3ezdsmaVumuf",
  configuration: {
    baseURL: "https://api.302.ai/v1",
  },
});

const cheerioLoader = new CheerioWebBaseLoader(
  'https://juejin.cn/post/7233327509919547452',
  {
    selector: '.main-area p'
  }
);

const documents = await cheerioLoader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
  // 每个分块的字符数
  chunkSize: 400,
  // 分块之间的重叠字符数
  chunkOverlap: 50,
  // 分隔符，优先使用段落分隔
  separators: ['。', '!', '?'],
});

const splitDocuments = await textSplitter.splitDocuments(documents);

console.log(`文档分割完成，共 ${splitDocuments.length} 个分块\n`);

console.log(chalk.bgGreen('正在创建向量存储...'));

const vectorStore = await MemoryVectorStore.fromDocuments(
  splitDocuments,
  embeddings
);

console.log(chalk.bgGreen('向量存储创建完成'));

const retriever = vectorStore.asRetriever({ k: 2 });

const questions = [
  "父亲的去世对作者的人生态度产生了怎样的根本性逆转？"
];

for (const question of questions) {
  console.log('='.repeat(80));
  console.log(`问题：${question}`);
  console.log('='.repeat(80));

  // 使用 retriever 获取相关文档
  const retrievedDocs = await retriever.invoke(question);

  // 构建 prompt
  const context = retrievedDocs
    .map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`)
    .join("\n\n━━━━━\n\n");

  const prompt = `你是一个文章辅助阅读助手，根据文章内容来解答：

文章内容：
${context}

问题: ${question}

你的回答:`;

  console.log("\n【AI 回答】");

  const stream = await model.stream(prompt);
  for await (const chunk of stream) {
    process.stdout.write(chunk.content);
  }
  console.log('\n');
}