const WebSocketServer = require('websocket').server;

let api = function FSocketServer() {
    let own = this;
    own.wsServer = null;

    /**
     * Futures heartbeat code with a shared single interval tick
     * @return {undefined}
     */
    own.connect = (server) => {       

        own.wsServer = new WebSocketServer({
            httpServer: server
        });

        listening();

        return own.wsServer;
    };

    own.users = {};
    own.subscriptions = {};
    own.events = {};

    /**
     * Called when a futures socket is opened, subscriptions are registered for later reference
     * @param {function} openCallback - a callback function
     * @return {undefined}
     */
    function listening() {
        own.wsServer.on('request', function (request) {
            console.log('Client has connected.');
            const connection = request.accept(null, request.origin);
            let user = {
                id: request.key,
                connection,
                request
            };
            own.users[request.key] = user;

            // on connect
            if (own.events["connect"]) {
                for (const key in own.events["connect"]) {
                    if (own.events["connect"].hasOwnProperty(key)) {
                        const element = own.events["connect"][key];
                        element(user);
                    }
                }
            }

            connection.on('message', function (message) {
                try {
                    let json = JSON.parse(message.utf8Data);
                    if (json.type == 'subscribe') {
                        own.subscriptions[json.value] = own.subscriptions[json.value] || {};
                        own.subscriptions[json.value][request.key] = connection;
                    }

                    if (json.type == 'unsubscribe') {
                        delete own.subscriptions[json.value][request.key];
                    }

                    if (json.type == 'data' && json.eventName) {
                        if (own.events[json.eventName]) {
                            for (const key in own.events[json.eventName]) {
                                if (own.events[json.eventName].hasOwnProperty(key)) {
                                    const element = own.events[json.eventName][key];
                                    element(user, json.value);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error((error.stack || error.message) + '; Received Message:', message.utf8Data);
                }
            });

            connection.on('close', function (reasonCode, description) {
                console.log('Client has disconnected.');

                for (const key in own.subscriptions) {
                    if (own.subscriptions.hasOwnProperty(key)) {
                        const subscription = own.subscriptions[key];
                        if (subscription[request.key]) {
                            delete subscription[request.key];
                        }
                    }
                }

                // on connect
                if (own.events["disconnect"]) {
                    for (const key in own.events["disconnect"]) {
                        if (own.events["disconnect"].hasOwnProperty(key)) {
                            const element = own.events["disconnect"][key];
                            element(own.users[request.key]);
                        }
                    }
                }

                delete own.users[request.key];
            });
        });
    };

    // own.addSubscription = (subscription, callback) => {
    //     let guid = uuidv4();
    //     own.manager.subscriptions[subscription] = {};
    //     own.manager.subscriptions[subscription][guid] = callback;
    //     return {
    //         guid, 
    //         emit: (value) => {
    //             own.emit(subscription, value)
    //         }
    //     };
    // }

    own.emit = function (subscription, value) {
        for (const key in own.subscriptions[subscription]) {
            if (own.subscriptions[subscription].hasOwnProperty(key)) {
                const connection = own.subscriptions[subscription][key];
                connection.sendUTF(JSON.stringify({
                    type: "subscription",
                    subscription,
                    value: value
                }));
            }
        }
    }

    own.on = function (eventName, callback) {
        let guid = uuidv4();
        own.events[eventName] = {};
        own.events[eventName][guid] = callback;
        return guid;
    }

    own.unsubscribe = function (guid) {
        for (const key in own.events) {
            if (own.events.hasOwnProperty(key)) {
                const iterator = own.events[key];
                if (iterator[guid]) {
                    delete iterator[guid];                    
                }
            }
        }
    }

    /**
     * Used to terminate a websocket
     */
    own.terminate = () => {
        own.wsServer.closeAllusers();
        own.wsServer = null;
    }

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

}

module.exports = api;