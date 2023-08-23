import { Client, Pool } from 'pg';
import logger from '../utils/logger';
import config from '../../config/defaults';

const client = new Client({
    connectionString: config.dbUri,
});


async function connect() {
    try {
        await client.connect();
        logger.info('Connected to PostgreSQL database');
    } catch (error) {
        logger.error('Could not connect to the database:', error);
        process.exit(1);
    }
}
export default connect;
