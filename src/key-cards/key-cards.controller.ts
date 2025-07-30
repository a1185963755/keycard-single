import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { KeyCardsService } from './key-cards.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { KeyCard, KeyCardStatus } from './entities/key-card.entity';
import { Batch } from './entities/batch.entity';
import { RequireKeyCard } from 'src/decorators/require-key-card.decorator';

@Controller('key-cards')
export class KeyCardsController {
  constructor(private readonly keyCardsService: KeyCardsService) {}

  // 美团领券接口
  @RequireKeyCard()
  @Post('getMtCoupon')
  async getCoupon(
    @Body('mtToken') mtToken: string,
    @Headers('x-key-card') code: string,
  ) {
    return this.keyCardsService.getCoupon(mtToken, code);
  }

  // 创建卡密批次
  @Post('batch')
  createBatch(@Body() createBatchDto: CreateBatchDto): Promise<Batch> {
    return this.keyCardsService.createBatch(createBatchDto);
  }

  // 获取所有批次
  @Get('batch')
  findAllBatches(): Promise<Batch[]> {
    return this.keyCardsService.findAllBatches();
  }

  // 通过批次ID查询卡密
  @Get('batch/:id')
  findKeyCardsByBatchId(@Param('id') id: string): Promise<KeyCard[]> {
    return this.keyCardsService.findKeyCardsByBatchId(+id);
  }

  // 根据状态查询卡密
  @Get('status/:status')
  findKeyCardsByStatus(
    @Param('status') status: KeyCardStatus,
  ): Promise<KeyCard[]> {
    return this.keyCardsService.findKeyCardsByStatus(status);
  }

  // 查询卡密信息（包括到期时间）
  @Get('info')
  async getKeyCardInfo(@Query('code') code: string) {
    return await this.keyCardsService.findKeyCardByCode(code);
  }
}
