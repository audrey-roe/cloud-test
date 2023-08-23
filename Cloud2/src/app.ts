import express from "express";
import connect from "./utils/connect";
import logger from "./utils/logger";
// import deserializeUser from "./middleware/deserializeUser"
import routes from "./routes";
import config from '../config/defaults';
import dotenv from 'dotenv';
dotenv.config();

const app = express()
const port = config.port;
app.use(express.json());
// app.use(deserializeUser);

app.listen(port, async () => {
  logger.info(`Server is running on http://localhost:${port}`);
  await connect();
  routes(app)
})
