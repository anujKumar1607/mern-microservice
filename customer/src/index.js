const express = require('express');
const { PORT } = require('./config');
const { databaseConnection } = require('./database');
const expressApp = require('./express-app');
const { CreateChannel, registerService, deregisterService } = require('./utils');
const client = require("prom-client");
const cors  = require('cors');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const CONSUL_HOST = process.env.CONSUL_HOST || 'consul';
const CONSUL_PORT = process.env.CONSUL_PORT || 8500;
const SERVICE_NAME = 'customer';
const SERVICE_ID = `${SERVICE_NAME}-${uuidv4()}`;
const SERVICE_ADDRESS = process.env.HOSTNAME || os.hostname(); // in Docker network the container name resolves; otherwise use host IP



const StartServer = async() => {

    const app = express();
    const register = new client.Registry();
    
    await databaseConnection();

    client.collectDefaultMetrics({ register });
    // Custom metric: HTTP request duration
    const httpRequestDurationMicroseconds = new client.Histogram({
        name: "http_request_duration_seconds",
        help: "Duration of HTTP requests in seconds",
        labelNames: ["method", "route", "status_code"],
        buckets: [0.1, 0.5, 1, 3, 5] // seconds
    });

    register.registerMetric(httpRequestDurationMicroseconds);

    app.use(cors({ origin: ['http://localhost:5173'], credentials: true }))
    app.use(express.json())

     // Health check endpoint for Consul
    app.get('/health', (req, res) => res.sendStatus(200));

    const channel = await CreateChannel()

    await expressApp(app);
    
    // Middleware to record metrics
    app.use((req, res, next) => {
        const end = httpRequestDurationMicroseconds.startTimer();
        res.on("finish", () => {
            end({ method: req.method, route: req.route?.path, status_code: res.statusCode });
        });
        next();
    });

    app.get("/metrics", async (req, res) => {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
    });

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
