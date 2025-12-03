import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { MenuModule } from './menu/menu.module';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { AssignmentModule } from './assignment/assignment.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CommonModule,
    PrismaModule,
    MenuModule,
    UserModule,
    OrderModule,
    AssignmentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

