import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeyCardsController } from './key-cards.controller';
import { KeyCardsService } from './key-cards.service';
import { KeyCard } from './entities/key-card.entity';
import { Batch } from './entities/batch.entity';
import { KeyCardGuard } from '../guards/key-card.guard';

@Module({
  imports: [TypeOrmModule.forFeature([KeyCard, Batch])],
  controllers: [KeyCardsController],
  providers: [KeyCardsService, KeyCardGuard],
  exports: [KeyCardsService],
})
export class KeyCardsModule {}
