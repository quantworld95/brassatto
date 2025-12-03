import { Module } from '@nestjs/common';
import {
  UserController,
  ClienteController,
  ConductorController,
  AdministradorController,
} from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [
    UserController,           // Legacy - compatibilidad con bot Telegram
    ClienteController,        // Nuevo controlador de clientes
    ConductorController,      // Nuevo controlador de conductores
    AdministradorController,  // Nuevo controlador de administradores
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
