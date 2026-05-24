import { WebSocket, WebSocketServer } from 'ws'
import { wsArcjet } from '../arcjet.js';
import { codec } from 'zod';

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
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



export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });

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

        sendJson(socket, { type: 'welcome' });

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
        broadcast(wss, { type: 'match_created', data: match });
    }
    return { broadcastMatchCreated }
}