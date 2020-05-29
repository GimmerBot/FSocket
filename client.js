

function FSocketClient(wsUrl, onconnect, own) {
    own = own || this;
    own.onconnect = onconnect;
    own.subscriptions = {};
    own.ws = new WebSocket(wsUrl);

    own.ws.onopen = function () {
        console.log('WebSocket Client Connected');
        if (own.onconnect) {
            own.onconnect(own);
        }
    };

    own.ws.onclose = function () {
        console.log('WebSocket Client Diconnected');
        // Try to reconnect in 5 seconds
        setTimeout(function () {
            if (own.ws.readyState == 1) {
                if (own.onconnect) {
                    own.onconnect(own);
                }
            }
            else {
                FSocketClient(wsUrl, onconnect, own);
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
        } catch (error) {

        }
    };

    own.emit = (eventName, value, callback) => {
        own.ws.send(JSON.stringify({
            type: "data",
            eventName: eventName,
            value
        }));
    }

    own.on = (subscription, callback) => {
        let guid = uuidv4();
        own.subscriptions[subscription] = own.subscriptions[subscription] || {};
        own.subscriptions[subscription][guid] = {
            subscription,
            callback
        };

        own.ws.send(JSON.stringify({
            type: "subscribe",
            value: subscription
        }));

        return guid;
    }

    own.unsubscribe = (guid) => {

        for (const key in own.subscriptions) {
            if (own.subscriptions.hasOwnProperty(key)) {
                const iterator = own.subscriptions[key];
                if (iterator[guid]) {
                    own.ws.send(JSON.stringify({
                        type: "unsubscribe",
                        value: key
                    }));
                    delete iterator[guid];
                }
            }
        }        
    }

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

