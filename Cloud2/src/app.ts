import express from "express";
import connect from "./utils/connect";
import logger from "./utils/logger";
// import deserializeUser from "./middleware/deserializeUser"
import session from 'express-session';
import connectRedis from 'connect-redis';
import { createClient } from 'redis';
import routes from "./routes";
import config from '../config/defaults';
import dotenv from 'dotenv';
dotenv.config();

const app = express()
const port = config.port;
app.use(express.json());
// app.use(deserializeUser);
const redisClient = createClient({ legacyMode: true })
const RedisStore = connectRedis(session);
redisClient.connect().catch((err) => {
  logger.info('Error connecting to Redis:', err);
});

// app.use(setupRedisMiddleware);
const sessionSecret = process.env.sessionSecret !== undefined ? process.env.sessionSecret : 'D9lTgknR8YBPzwTqZRred9tEu4uI3xus';

app.use(session({
  store: new RedisStore({
    client: redisClient
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,//if true only transmit over https TODO change to true for porduction
    httpOnly: false,
    maxAge: 4500 * 60 * 10 //setting the session age in millisec (45mins)
  }
}));
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.listen(port, async () => {
  logger.info(`Server is running on http://localhost:${port}`);
  await connect();
  routes(app)
})
