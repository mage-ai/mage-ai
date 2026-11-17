export type OAuthWebsocketDataType = {
  api_key: string;
  token: string;
};

export function initializeTerminalConnection(
  event: WebSocketEventMap['open'],
  oauthWebsocketData: OAuthWebsocketDataType,
) {
  const socket = event.currentTarget as WebSocket;
  socket.send(JSON.stringify({
    ...oauthWebsocketData,
    command: ['set_size', 24, 80],
  }));
}
