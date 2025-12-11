import { Logger, UnauthorizedException } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { CORS } from 'src/shared/constants';
import { SocketWithInitDataAndUser } from 'src/shared/types';
import { Server } from 'socket.io';
import { AuthService } from '../auth/auth.service';

@WebSocketGateway({ cors: CORS })
export class GatewayService implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(private readonly authService: AuthService) {}

    private readonly logger = new Logger(GatewayService.name);
    private readonly _sockets = new Map<string, Array<SocketWithInitDataAndUser>>();

    @WebSocketServer()
    private readonly _server: Server;

    get sockets() {
        return this._sockets;
    }

    get server() {
        return this._server;
    }

    afterInit(server: Server) {
        server.use(async (socket, next) => {
            try {
                const { 0: type, 1: data } = (socket.handshake.headers['authorization'] || '').split(' ');
        
                if (!type || !data || type !== 'tma') throw new UnauthorizedException();
        
                socket.data.init_data = this.authService.parseInitData(data);
                socket.data.user = await this.authService.validate(socket.data.init_data.user.id);

                next();
            } catch (error) {
                this.logger.error(error);
                return next(new Error('Unauthorized'));
            }
        })
    }

    handleConnection(client: SocketWithInitDataAndUser) {
        const userId = client.data.user._id.toString();
        
        this.sockets.has(userId) ? this.sockets.get(userId)?.push(client) : this.sockets.set(userId, [client]);
    }

    handleDisconnect(client: SocketWithInitDataAndUser) {
        const userId = client.data.user._id.toString();
        const sockets = this.sockets.get(userId).filter((socket) => socket.id !== client.id);

        sockets.length ? this.sockets.set(userId, sockets) : this.sockets.delete(userId);
    }
}
