import express from 'express';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

// serve the static html
app.use(express.static(path.join(__dirname, 'public')));

// serve the build js
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// start server and bind port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});