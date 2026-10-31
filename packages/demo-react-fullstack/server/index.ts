import { createDemoServer } from './app';

const port = Number(process.env.PORT ?? 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
const { app, close } = await createDemoServer(process.env.NODE_ENV !== 'production');
const server = app.listen(port, '127.0.0.1', () => {
  console.info(`TML playground: http://localhost:${port}`);
});

async function shutdown() {
  await close();
  server.close();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
