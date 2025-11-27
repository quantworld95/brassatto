import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MenuModule } from './menu/menu.module';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [PrismaModule, MenuModule, UserModule, OrderModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

