const axios = require('axios');

function consulBaseUrl(host = 'localhost', port = 8500) {
  return `http://${host}:${port}/v1`;
}

/**
 * registerService
 * @param {Object} opts {name, id, address, port, checkPath, consulHost, consulPort, checkInterval}
 */
async function registerService(opts) {
  const { name, id, address, port, checkPath = '/', consulHost = 'localhost', consulPort = 8500, checkInterval = '10s' } = opts;
  const service = {
    ID: id,
    Name: name,
    Address: address,
    Port: port,
    Check: {
      HTTP: `http://${address}:${port}${checkPath}`,
      Interval: checkInterval,
      DeregisterCriticalServiceAfter: '1m'
    }
  };

  const url = `${consulBaseUrl(consulHost, consulPort)}/agent/service/register`;
  await axios.put(url, service);
  return true;
}


async function deregisterService(id, consulHost = 'localhost', consulPort = 8500) {
  const url = `${consulBaseUrl(consulHost, consulPort)}/agent/service/deregister/${id}`;
  await axios.put(url);
  return true;
}


async function discoverServiceInstances(serviceName, consulHost = 'localhost', consulPort = 8500) {
  const url = `${consulBaseUrl(consulHost, consulPort)}/health/service/${serviceName}?passing=true`;
  const res = await axios.get(url);
  // each item has Node, Service, Checks
  return res.data.map(item => item.Service).map(s => ({
    ID: s.ID,
    Service: s.Service,
    Address: s.Address || s.ServiceAddress || 'localhost',
    Port: s.Port
  }));
}

module.exports = {
  registerService,
  deregisterService,
  discoverServiceInstances
};