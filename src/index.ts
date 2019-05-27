require('module-alias/register');

import {Server} from "@server/src/core";

const server = new Server();

server.init();