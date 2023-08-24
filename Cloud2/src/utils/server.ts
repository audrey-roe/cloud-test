import express from 'express';
import session from 'express-session';

export async function startTestServer() {
  const app = express();
  const port = process.env.TEST_PORT || 3024;
  const MemoryStore = session.MemoryStore;
  const sessionStore = new MemoryStore();

  app.use(express.json());

  app.use(session({
    store: sessionStore,
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: false,
      maxAge: 4500 * 60 * 10,
    },
  }));

  app.listen(port, async () => {
    console.log(`Test server is running on http://localhost:${port}`);
  });
}

