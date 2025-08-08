const express = require("express");
const cors = require("cors");
const proxy = require("express-http-proxy");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/customer", proxy("http://customer:8001"));
app.use("/shopping", proxy("http://shopping:8003"));
app.use("/", proxy("http://products:8002")); // products

app.listen(8000, () => {
  console.log("Gateway is Listening to Port 8000");
});
