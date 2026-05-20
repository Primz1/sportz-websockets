import express from 'express';
import { matchRouter } from './routes/matches.js';

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Sportz API!' });
});

app.use('/matches', matchRouter)

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});