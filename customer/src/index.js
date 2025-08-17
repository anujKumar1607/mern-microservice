const express = require('express');
const { PORT } = require('./config');
const { databaseConnection } = require('./database');
const expressApp = require('./express-app');
const { CreateChannel, registerService, deregisterService } = require('./utils');

const os = require('os');
const { v4: uuidv4 } = require('uuid');
const CONSUL_HOST = process.env.CONSUL_HOST || 'consul';
const CONSUL_PORT = process.env.CONSUL_PORT || 8500;
const SERVICE_NAME = 'customer';
const SERVICE_ID = `${SERVICE_NAME}-${uuidv4()}`;
const SERVICE_ADDRESS = process.env.HOSTNAME || os.hostname(); // in Docker network the container name resolves; otherwise use host IP
import { auth, requiredScopes } from 'express-oauth2-jwt-bearer';


const StartServer = async() => {

    const app = express();
    
    await databaseConnection();

    // app.use(cors({ origin: ['http://localhost:5173'], credentials: true }))
    app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));
    app.use(express.json())

     // Health check endpoint for Consul
    app.get('/health', (req, res) => res.sendStatus(200));

    const channel = await CreateChannel()

    await expressApp(app);
    

    app.listen(PORT,'0.0.0.0', async () => {
          console.log(`listening to port ${PORT}`);
            try {
                await registerService({
                    name: SERVICE_NAME,
                    id: SERVICE_ID,
                    address: SERVICE_ADDRESS,
                    port: Number(PORT),
                    checkPath: '/health',
                    consulHost: CONSUL_HOST,
                    consulPort: CONSUL_PORT,
                    checkInterval: '10s'
                });
                console.log(`✅ Registered ${SERVICE_NAME} in Consul`);
            } catch (err) {
                console.error(`❌ Consul registration failed: ${err.message}`);
            }
    })
    .on('error', (err) => {
        console.log(err);
        process.exit();
    })
    .on('close', () => {
        channel.close();
    });

    // Deregister on shutdown
    process.on('SIGINT', async () => {
        await deregisterService(SERVICE_ID, CONSUL_HOST, CONSUL_PORT);
        process.exit();
    });
    process.on('SIGTERM', async () => {
        await deregisterService(SERVICE_ID, CONSUL_HOST, CONSUL_PORT);
        process.exit();
    });
    

}

StartServer();
