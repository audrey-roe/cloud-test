import express from "express";
import connect from "./utils/connect";
import logger from "./utils/logger";
import session from 'express-session';
import connectRedis from 'connect-redis';
import { createClient } from 'redis';
import routes from "./routes";
import config from '../config/defaults';
import dotenv from 'dotenv';
import multer from 'multer';
const storage = multer.memoryStorage(); 
const upload = multer({ storage });

dotenv.config();

const app = express();
app.use(express.json());

const redisClient = createClient({
    url: process.env.REDIS_URL,
    legacyMode: true
});
const RedisStore = connectRedis(session);
redisClient.connect().catch((err) => {
  logger.error('Error connecting to Redis:', err);
});

// app.use(setupRedisMiddleware);
const sessionSecret = process.env.sessionSecret !== undefined ? process.env.sessionSecret : 'D9lTgknR8YBPzwTqZRred9tEu4uI3xus';


app.use(session({
  store: new RedisStore({
    client: redisClient
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,//if true only transmit over https TODO change to true for porduction
    httpOnly: false,
    maxAge: 12000 * 60 * 10 //setting the session age in millisec (2hrs)
  }
}));

const port = process.env.PORT || 3001;

app.listen(port, async () => {
  logger.info(`Server is running on http://localhost:${port}`);
  await connect();
  routes(app)
})
