import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate, getThreadMessages } from './chatbot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8000;
const staticDir = path.join(__dirname, 'dist');

app.use(express.json());
app.use(cors());
app.use(express.static(staticDir));

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

app.get(/^(?!\/assets).*/, (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is up and running at port: ${PORT}`);
});
