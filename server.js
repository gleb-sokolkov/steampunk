const express = require('express');
const config = require('./config');

const server = express();

server.use(express.static(config.paths.common.dirnames.public));
server.listen(config.port || process.env.PORT, () => console.log('Server was started'));
