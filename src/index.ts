import { DurableObject } from 'cloudflare:workers';

type Env = {
  WEBSOCKET_HIBERNATION_SERVER: DurableObjectNamespace;
};

// Worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.url.endsWith('/ws')) {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Durable Object expected Upgrade: websocket', { status: 426 });
      }
      const stub = env.WEBSOCKET_HIBERNATION_SERVER.get(env.WEBSOCKET_HIBERNATION_SERVER.idFromName('test'));
      return stub.fetch(request);
    }
    return new Response(null, {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
};

// Durable Object
export class WebSocketHibernationServer extends DurableObject {
  async fetch(_request: Request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    console.log(`[Durable Object] message: ${message}, connections: ${this.ctx.getWebSockets().length}`);
    this.ctx.getWebSockets().forEach(client => client.send(message));
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    console.log(ws, code, reason, wasClean)
    ws.close(code, 'Durable Object is closing WebSocket');
  }
}
