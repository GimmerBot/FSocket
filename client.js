

function FSocketClient(wsUrl, onconnect, own) {
    own = own || this;
    own.subscriptions = own.subscriptions || {};
    own.events = {};
    own.ws = new WebSocket(wsUrl);

    own.ws.onopen = function () {
        console.log('WebSocket Client Connected');
        if (!own.onconnect && onconnect) {
            own.onconnect = onconnect;
            own.onconnect(own);
        }

        // resend the subscriptions
        for (const key in own.subscriptions) {
            if (own.subscriptions.hasOwnProperty(key)) {
                if (key != 'connect' && key != 'disconnect' && key != 'reconnecting' && key != 'reconnected') {
                    const element = own.subscriptions[key];
                    own.ws.send(JSON.stringify({
                        type: "subscribe",
                        value: key
                    }));
                }
            }
        }

        // send connect event
        if (own.subscriptions['connect']) {
            for (const key in own.subscriptions['connect']) {
                if (own.subscriptions['connect'].hasOwnProperty(key)) {
                    const element = own.subscriptions['connect'][key];
                    element.callback();
                }
            }
        }
    };

    own.ws.onclose = function () {
        // send disconnect event
        if (own && own.subscriptions['disconnect']) {
            for (const key in own.subscriptions['disconnect']) {
                if (own.subscriptions['disconnect'].hasOwnProperty(key)) {
                    const element = own.subscriptions['disconnect'][key];
                    element.callback();
                }
            }
        }

        // Try to reconnect in 5 seconds
        setTimeout(function () {
            if (own && own.ws) {
                if (own.ws.readyState == 1) {
                    if (own && own.subscriptions['reconnected']) {
                        for (const key in own.subscriptions['reconnected']) {
                            if (own.subscriptions['reconnected'].hasOwnProperty(key)) {
                                const element = own.subscriptions['reconnected'][key];
                                element.callback();
                            }
                        }
                    }
                }
                else {                   

                    if (own && own.subscriptions['reconnecting']) {
                        for (const key in own.subscriptions['reconnecting']) {
                            if (own.subscriptions['reconnecting'].hasOwnProperty(key)) {
                                const element = own.subscriptions['reconnecting'][key];
                                element.callback();
                            }
                        }
                    }

                    // retry connect
                    FSocketClient(wsUrl, onconnect, own);
                }
            }
        }, 5000);
    };

    own.ws.onmessage = function (e) {
        try {
            let json = JSON.parse(e.data);

            if (json.type == 'subscription' && own.subscriptions[json.subscription]) {
                for (const key in own.subscriptions[json.subscription]) {
                    if (own.subscriptions[json.subscription].hasOwnProperty(key)) {
                        const element = own.subscriptions[json.subscription][key];
                        element.callback(json.value);
                    }
                }
            }

            if (json.type == 'data' && own.events[json.eventName]) {
                const element = own.events[json.eventName];
                element.callback(json.value);
            }
        } catch (error) {

        }
    };

    own.connect = () => {
        // retry connect
        FSocketClient(wsUrl, onconnect, own);
    }

    own.disconnect = () => {
        own.ws = null;
    }

    own.emit = (eventName, value, callback) => {
        let guid = uuidv4();
        own.events[eventName] = {
            eventName: eventName,
            callback
        };

        if (own.ws && own.ws.readyState == 1) {
            own.ws.send(JSON.stringify({
                type: "data",
                eventName: eventName,
                value
            }));
        }
    }

    own.on = (subscription, callback) => {
        let guid = uuidv4();
        own.subscriptions[subscription] = own.subscriptions[subscription] || {};
        own.subscriptions[subscription][guid] = {
            subscription,
            callback
        };

        if (own.ws && own.ws.readyState == 1) {
            own.ws.send(JSON.stringify({
                type: "subscribe",
                value: subscription
            }));
        }

        return guid;
    }

    own.unsubscribe = (guid) => {
        for (const key in own.subscriptions) {
            if (own.subscriptions.hasOwnProperty(key)) {
                const iterator = own.subscriptions[key];
                if (iterator[guid]) {
                    if (own.ws && own.ws.readyState == 1) {
                        own.ws.send(JSON.stringify({
                            type: "unsubscribe",
                            value: key
                        }));
                    }
                    delete iterator[guid];
                }
            }
        }
    }

    own.removeAllListeners = () => {
        for (const key in own.subscriptions) {
            if (own.subscriptions.hasOwnProperty(key)) {
                const guids = own.subscriptions[key];

                for (const guid in guids) {
                    if (own.ws && own.ws.readyState == 1) {
                        own.ws.send(JSON.stringify({
                            type: "unsubscribe",
                            value: key
                        }));
                    }
                }
            }
        }

        own.subscriptions = {};
        own.events = {};
    }

    own.destroy = () => {
        own.removeAllListeners();

        if (own.ws && own.ws.readyState == 1) {
            own.ws.close();
        }

        own.ws = null;
        own.subscriptions = {};
        own.events = {};
        own = null;
    }

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    return own;
}

