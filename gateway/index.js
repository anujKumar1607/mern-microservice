const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");
const axios = require("axios");

const app = express();

const CONSUL_HOST = process.env.CONSUL_HOST || "consul";
const CONSUL_PORT = process.env.CONSUL_PORT || 8500;

app.use(cors());
app.use(express.json());

// Function to get healthy instance of a service from Consul
async function getServiceUrl(serviceName) {
  const url = `http://${CONSUL_HOST}:${CONSUL_PORT}/v1/health/service/${serviceName}?passing=true`;

  const res = await axios.get(url);
  if (!res.data.length) {
    throw new Error(`No healthy instances for ${serviceName}----${url}`);
  }

  // Pick first healthy instance (can add round-robin later)
  const instance = res.data[0].Service;
  return `http://${instance.Address}:${instance.Port}`;
}


// Create dynamic proxy middleware
function dynamicProxy(serviceName) {
  return async (req, res, next) => {
    try {
      const target = await getServiceUrl(serviceName);
      return proxy(target.replace(/^http:\/\//, ""), { https: false })(req, res, next);
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  };
}

app.use("/customer", dynamicProxy("customer"));
app.use("/shopping", dynamicProxy("shopping"));
app.use("/", dynamicProxy("products"));

// app.use("/customer", proxy("http://customer:8001"));
// app.use("/shopping", proxy("http://shopping:8003"));
// app.use("/", proxy("http://products:8002")); // products

// app.use("/customer", proxy("http://localhost:8001"));
// app.use("/shopping", proxy("http://localhost:8003"));
// app.use("/", proxy("http://localhost:8002")); // products

app.listen(8000, () => {
  console.log("Gateway is Listening to Port 8000");
});
