const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const amqplib = require("amqplib");
const CircuitBreaker = require('opossum');

const {
  APP_SECRET,
  BASE_URL,
  PRODUCT_SERVICE,
  EXCHANGE_NAME,
  MSG_QUEUE_URL,
} = require("../config");

//Utility functions
module.exports.GenerateSalt = async () => {
  return await bcrypt.genSalt();
};

module.exports.GeneratePassword = async (password, salt) => {
  return await bcrypt.hash(password, salt);
};

module.exports.ValidatePassword = async (
  enteredPassword,
  savedPassword,
  salt
) => {
  return (await this.GeneratePassword(enteredPassword, salt)) === savedPassword;
};

module.exports.GenerateSignature = async (payload) => {
  try {
    return await jwt.sign(payload, APP_SECRET, { expiresIn: "30d" });
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports.ValidateSignature = async (req) => {
  try {
    const signature = req.get("Authorization");
    console.log(signature);
    const payload = await jwt.verify(signature.split(" ")[1], APP_SECRET);
    req.user = payload;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports.FormateData = (data) => {
  if (data) {
    return { data };
  } else {
    throw new Error("Data Not found!");
  }
};

//Raise Events
module.exports.callCustomerService = async (payload) => {
  // axios.post("http://customer:8001/app-events/", {
  //   payload,
  // });

  const url = `http://customer:8001/app-events/`;
  console.log("url", url)
  const response = await axios.post(url, {payload});
  return response.data;
};

module.exports.PublishShoppingEvent = async (payload) => {
  // axios.post('http://gateway:8000/shopping/app-events/',{
  //         payload
  // });

  axios.post(`http://shopping:8003/app-events/`, {
    payload,
  });
};

//Message Broker

module.exports.CreateChannel = async () => {
  try {
    const connection = await amqplib.connect(MSG_QUEUE_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(EXCHANGE_NAME, "direct", { durable: true });
    return channel;
  } catch (err) {
    throw err;
  }
};

module.exports.PublishMessage = (channel, service, msg) => {
  channel.publish(EXCHANGE_NAME, service, Buffer.from(msg));
  console.log("Sent: ", msg);
};

module.exports.SubscribeMessage = async (channel, service) => {
  await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
  const q = await channel.assertQueue("", { exclusive: true });
  console.log(` Waiting for messages in queue: ${q.queue}`);

  channel.bindQueue(q.queue, EXCHANGE_NAME, PRODUCT_SERVICE);

  channel.consume(
    q.queue,
    (msg) => {
      if (msg.content) {
        console.log("the message is pp:", msg.content.toString());
        service.SubscribeEvents(msg.content.toString());
      }
      console.log("[X] received pp");
    },
    {
      noAck: true,
    }
  );
};


// Circuit breaker options
const breakerOptions = {
    timeout: 5000, // If it takes longer than 5 seconds, fail
    errorThresholdPercentage: 50, // When 50% of requests fail...
    resetTimeout: 10000 // ...wait 10s before trying again
};

// Create breaker
const breaker = new CircuitBreaker(this.callCustomerService, breakerOptions);

breaker.fallback(() => {
    return { message: 'Customer service unavailable, using fallback data' };
});


module.exports.PublishCustomerEvent = async (customerId) => {
  try {
    const customer = await breaker.fire(customerId);
    console.log('Customer data:', customer);
    return customer;
  } catch (err) {
    console.error('Breaker error:', err.message);
    return { message: 'Customer service unavailable, using fallback data' };
  }
};
