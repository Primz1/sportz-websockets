import { WebSocket, WebSocketServer } from 'ws'
import { wsArcjet } from '../arcjet.js';

const matchSubscribers = new Map();

function subscribe(matchID, socket) {
    if (!matchSubscribers.has(matchID)) {
        matchSubscribers.set(matchID, new Set())
    }

    matchSubscribers.get(matchID).add(socket);
}

function unsubscribe(matchID, socket) {
    const subscribers = matchSubscribers.get(matchID);

    if (!subscribers) return;

    subscribers.delete(socket);

    if (subscribers.size === 0) {
        matchSubscribers.delete(matchID);
    }
}

function cleanupSubscriptions(socket) {
    for (const matchID of socket.subscriptions) {
        unsubscribe(matchID, socket);
    }
}

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

function broadcastToMatch(matchID, payload) {
    const subscribers = matchSubscribers.get(matchID);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload);

    for (const client of subscribers) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }

    }
}

function rejectUpgrade(socket, statusCode, statusMessage) {
    const body = statusMessage;
    const response = [
        `HTTP/1.1 ${statusCode} ${statusMessage}`,
        'Connection: close',
        'Content-Type: text/plain; charset=utf-8',
        `Content-Length: ${Buffer.byteLength(body)}`,
        '',
        body,
    ].join('\r\n');

    socket.write(response);
    socket.destroy();
}

function handleMessage(socket, data) {
    let message;
    try {
        message = JSON.parse(data.toString());

    } catch {
        sendJson(socket, { type: 'error', message: 'Invalid JSON' })
        return;
    }
    if (message?.type === 'subscribe' && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket, { type: 'subscribed', matchId: message.matchId });
        return;
    }
    if (message?.type === 'unsubscribe' && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket, { type: 'unsubscribed', matchId: message.matchId });
    }
}


export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });

    server.on('upgrade', async (req, socket, head) => {
        if (req.url !== '/ws') {
            return;
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    const deniedByRateLimit = decision.reason?.isRateLimit?.() ?? false;
                    const statusCode = deniedByRateLimit ? 429 : 403;
                    const statusMessage = deniedByRateLimit ? 'Too Many Requests' : 'Forbidden';

                    rejectUpgrade(socket, statusCode, statusMessage);
                    return;
                }
            } catch (e) {
                console.error('WS upgrade security error', e);
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    wss.on('connection', (socket) => {
        socket.isAlive = true;
        socket.on('pong', () => { socket.isAlive = true; });

        socket.subscriptions = new Set();

        sendJson(socket, { type: 'welcome' });

        socket.on('message', (data) => {
            handleMessage(socket, data);
        });
        socket.on('error', () => {
            socket.terminate();
        });
        socket.on('close', () => {
            cleanupSubscriptions(socket);
        });



        socket.on('error', console.error);

    });


    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => clearInterval(interval));

    function broadcastMatchCreated(match) {
        broadcastToAll(wss, { type: 'match_created', data: match });
    }

    function broadcastCommentary(matchId, comment){
        broadcastToMatch(matchId, {type: 'commentary', data: comment});
    }


    return { broadcastMatchCreated, broadcastCommentary};
}