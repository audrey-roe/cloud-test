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
import pool from './utils/pool'
const storage = multer.memoryStorage(); 
const upload = multer({ storage });

dotenv.config();

const app = express()
const port = config.port;
app.use(express.json());

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
    maxAge: 12000 * 60 * 10 //setting the session age in millisec (2hrs)
  }
}));


// app.use(async (req, res, next) => {
//   const userId = req.session.userId;

//   if (userId) {
//       const pgPool = await pool.connect();
//       const query = 'SELECT session_id FROM users WHERE id = $1';
//       const value = [userId]
//       const result = await pgPool.query(query, value);
//       const sessionId = result.rows[0].session_id;

//       if (sessionId !== req.session.id) {
//           req.session.destroy(err => {
//               if (err) {
//                   return next(err);
//               }
//               res.status(401).send('Session has been revoked');
//           });
//           return;
//       }
//   }
//   next();
// });


app.listen(port, async () => {
  logger.info(`Server is running on http://localhost:${port}`);
  await connect();
  routes(app)
})
