import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KeyCardsModule } from './key-cards/key-cards.module';
import { KeyCard } from './key-cards/entities/key-card.entity';
import { Batch } from './key-cards/entities/batch.entity';
import { APP_GUARD } from '@nestjs/core';
import { KeyCardGuard } from './guards/key-card.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host:
        process.env.NODE_ENV !== 'production' ? '47.106.209.17' : 'localhost',
      port: 3307,
      username: 'shangyin',
      password: 'oliver1101@',
      database: 'mt',
      entities: [KeyCard, Batch],
      synchronize: true, // 开发环境使用，生产环境不建议
      extra: {
        // 关闭 TypeORM 的时区转换（MySQL 5.5 不支持高精度时间戳）
        timezone: 'local',
      },
    }),
    KeyCardsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 全局卡密验证守卫
    {
      provide: APP_GUARD,
      useClass: KeyCardGuard,
    },
  ],
})
export class AppModule {}
