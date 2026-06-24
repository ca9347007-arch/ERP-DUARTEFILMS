import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`DuarteFilms API local rodando em http://localhost:${env.API_PORT}`);
});
