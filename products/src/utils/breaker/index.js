const axios = require('axios');
const CircuitBreaker = require('opossum');
const { discoverServiceInstances } = require('../consul');
const { callCustomerService } = require('../index')

async function fetchCustomer(customerId) {
    console.log("payload", customerId)
  // Discover all healthy customer services
  const instances = await discoverServiceInstances('customer', 'consul', 8500);

  if (!instances.length) {
    throw new Error('No healthy customer service instances found');
  }

  // Pick one at random
  const instance = instances[Math.floor(Math.random() * instances.length)];

  console.log(`🔄 Calling ${instance.ID} at ${instance.Address}:${instance.Port}`);

  const res = await axios.post(`http://customer:${instance.Port}/app-events`,{customerId});
  return res.data;
}

const breakerOptions = {
  timeout: 5000, // If request takes longer than 5s, fail
  errorThresholdPercentage: 50, // % of failures before opening
  resetTimeout: 10000 // Time before retrying after open
};

const breaker = new CircuitBreaker(fetchCustomer, breakerOptions);

// Optional logging
breaker.on('open', () => console.warn('⚠ Circuit breaker OPEN'));
breaker.on('halfOpen', () => console.log('↔ Circuit breaker HALF-OPEN'));
breaker.on('close', () => console.log('✅ Circuit breaker CLOSED'));

module.exports.breaker = breaker;