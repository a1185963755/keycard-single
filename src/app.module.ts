import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KeyCardsModule } from './key-cards/key-cards.module';
import { KeyCard } from './key-cards/entities/key-card.entity';
import { Batch } from './key-cards/entities/batch.entity';
import { APP_GUARD } from '@nestjs/core';
import { KeyCardGuard } from './guards/key-card.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host:
          process.env.NODE_ENV !== 'production'
            ? configService.get('DB_HOST')
            : 'localhost',
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [KeyCard, Batch],
        synchronize: true, // 开发环境使用，生产环境不建议
        extra: {
          // 关闭 TypeORM 的时区转换（MySQL 5.5 不支持高精度时间戳）
          timezone: 'local',
        },
      }),
    }),
    ScheduleModule.forRoot(),
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
