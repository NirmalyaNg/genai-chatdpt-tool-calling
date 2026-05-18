import { Groq } from 'groq-sdk';
import { tavily } from '@tavily/core';
import chalk from 'chalk';
import NodeCache from 'node-cache';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

export async function generate(question, threadId) {
  const baseMessages = [
    {
      role: 'system',
      content: `You are a smart personal assistant
        If you know the answer to a question, answer it directly in plain English.
        If the answer requires real-time information or latest data or if you don't know the answer, use the tools provided to retrieve the information and then answer the question based on the retrieved information.

        You have access to the following tools:
        1) webSearch({query}: {query: string}) // This tool can be used to retrieve latest information or real-time data from the internet based on a search query

        Decide carefully when to use the tools. If the question can be answered with your existing knowledge, answer it directly without using the tools. Use the tools only when necessary.
        Do not mention the tools in your final answer. Use the information retrieved from the tools to generate a complete and comprehensive answer to the user's question.

        Current date and time: ${new Date().toUTCString()}
      `,
    },
  ];

  const tools = [
    {
      type: 'function',
      function: {
        name: 'webSearch',
        description: 'Retrieve latest information or real-time data from the internet using a search query',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query against which the search needs to be performed',
            },
          },
          required: ['query'],
        },
      },
    },
  ];

  const messages = cache.get(threadId) ?? baseMessages;

  // Push user message
  messages.push({
    role: 'user',
    content: question,
  });

  let iterations = 0,
    MAX_ITERATIONS = 5;

  while (true) {
    if (iterations > MAX_ITERATIONS) {
      return "I couldn't generate the response. Please try again.";
    }
    iterations++;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      temperature: 1,
      tool_choice: 'auto',
      messages,
      tools,
    });

    // Push assistant message
    const message = completion.choices[0].message;
    messages.push(message);

    if (!message?.tool_calls) {
      // Assistant message received
      cache.set(threadId, messages);
      return message.content;
      break;
    }

    // Tool Calls
    for (let toolCall of message.tool_calls) {
      const {
        id,
        function: { name: functionName, arguments: functionArguments },
      } = toolCall;
      if (functionName === 'webSearch') {
        const content = await webSearch(JSON.parse(functionArguments));
        // Push tool call content
        messages.push({
          role: 'tool',
          tool_call_id: id,
          name: functionName,
          content,
        });
      }
    }
  }
}

export async function getThreadMessages(threadId) {
  const messages = cache.get(threadId);
  if (!messages) {
    return [];
  }
  return messages.filter((message) => message.role !== 'system');
}

async function webSearch({ query }) {
  console.log(chalk.green('Calling webSearch tool for query: ', query));
  const response = await tvly.search(query);
  const finalResult = response.results
    .map(
      (result, index) => `Search Result ${index + 1} : ${result.content}
  `,
    )
    .join('\n\n');
  return finalResult;
}
