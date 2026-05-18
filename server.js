import express from 'express';
import cors from 'cors';
import { generate, getThreadMessages } from './chatbot.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(cors());

app.get('/chat/:threadId', async (req, res) => {
  const { threadId } = req.params ?? {};
  if (!threadId) {
    res.status(400).json({
      status: 'fail',
      error: 'Thread ID is required',
    });
    return;
  }
  try {
    const messages = await getThreadMessages(threadId);
    res.json({
      status: 'success',
      messages,
    });
  } catch (error) {
    res.json({
      status: 'error',
      error: 'Failed to fetch messages',
    });
  }
});

app.post('/chat', async (req, res) => {
  const { message, threadId } = req.body ?? {};
  if (!message || !threadId) {
    res.status(400).json({
      status: 'fail',
      error: 'All fields are required',
    });
    return;
  }
  try {
    const response = await generate(message, threadId);
    res.json({
      status: 'success',
      message: response,
    });
  } catch (error) {
    res.json({
      status: 'error',
      error: 'Failed to generate response',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is up and running at port: ${PORT}`);
});
