import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KeyCard, KeyCardStatus } from './entities/key-card.entity';
import { Batch } from './entities/batch.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class KeyCardsService {
  constructor(
    @InjectRepository(KeyCard)
    private keyCardRepository: Repository<KeyCard>,
    @InjectRepository(Batch)
    private batchRepository: Repository<Batch>,
  ) {}

  // 验证卡密
  async getCoupon(mtToken: string, code: string) {
    const keyCard = await this.keyCardRepository.findOne({
      where: { code },
    });

    if (!keyCard) {
      throw new NotFoundException('卡密不存在');
    }

    // 检查卡密是否已被使用
    if (keyCard.status === KeyCardStatus.USED) {
      return {
        ...keyCard,
        coupon_info: JSON.parse(keyCard.coupon_info),
      };
    }

    const couponData = await Promise.all([
      this.getCoupon1(mtToken),
      this.getCoupon2(mtToken),
    ]);
    const flatCouponData = couponData.flat();
    if (flatCouponData.length === 0) {
      throw new HttpException('领券失败，请稍后重试', HttpStatus.NOT_FOUND);
    }
    // 首次使用，设置首次使用时间和过期时间
    const now = new Date();
    keyCard.firstUseTime = now;
    keyCard.status = KeyCardStatus.USED;
    keyCard.meituan_token = mtToken;
    keyCard.coupon_info = JSON.stringify(flatCouponData);
    await this.keyCardRepository.save(keyCard);
    return {
      ...keyCard,
      coupon_info: JSON.parse(keyCard.coupon_info),
    };
  }

  // 创建卡密批次
  async createBatch(createBatchDto: CreateBatchDto): Promise<Batch> {
    const batch = this.batchRepository.create({
      ...createBatchDto,
    });

    const savedBatch = await this.batchRepository.save(batch);

    // 生成卡密
    await this.generateKeyCards(savedBatch);

    return savedBatch;
  }

  // 生成卡密
  private async generateKeyCards(batch: Batch): Promise<void> {
    const { count } = batch;

    const keyCards: KeyCard[] = [];

    for (let i = 0; i < count; i++) {
      // 生成随机卡密码
      const code = this.generateUniqueCode();

      const keyCard = this.keyCardRepository.create({
        code,
        batchId: batch.id,
        status: KeyCardStatus.UNUSED,
      });

      keyCards.push(keyCard);
    }

    // 批量保存卡密
    await this.keyCardRepository.save(keyCards);
  }

  // 生成唯一卡密码
  private generateUniqueCode(length = 16): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 62 个字符
    let result = '';
    const bytes = randomBytes(length);

    for (let i = 0; i < length; i++) {
      // 使用模运算映射到 0~61，然后查表
      result += chars[bytes[i] % chars.length];
    }

    return result;
  }

  // 查询所有批次
  async findAllBatches(): Promise<Batch[]> {
    return this.batchRepository.find();
  }

  // 通过批次ID查询卡密
  async findKeyCardsByBatchId(batchId: number): Promise<KeyCard[]> {
    return this.keyCardRepository.find({
      where: { batchId },
    });
  }

  // 根据状态查询卡密
  async findKeyCardsByStatus(status: KeyCardStatus): Promise<KeyCard[]> {
    return this.keyCardRepository.find({
      where: { status },
    });
  }

  // 根据卡密查询卡密信息
  async findKeyCardByCode(code: string): Promise<KeyCard> {
    const keyCard = await this.keyCardRepository.findOne({
      where: { code },
    });

    if (!keyCard) {
      throw new NotFoundException('卡密不存在');
    }
    return keyCard;
  }

  async getCoupon1(token: string) {
    try {
      const res = await fetch(
        'https://mediacps.meituan.com/gundam/gundamGrabV4?gdBs=&pageVersion=1753707381003&yodaReady=h5&csecplatform=4&csecversion=3.2.1',
        {
          method: 'POST',
          body: JSON.stringify({
            gundamId: 531693,
            instanceId: '17211892932540.47486483758713405',
            actualLongitude: 114174328,
            actualLatitude: 22316555,
            needTj: false,
            couponConfigIdOrderCommaString:
              '45103988015753,44617127887497,45291946771081,44430111474313,44525912457865,45448001880713,44755597656713,44602983514761,45299878134409,45366598042249,44769143751305,45406499832457,44665315328649,35503293858441,35506573542025,35506322080393,35364990026377,35371666506377,8650758750857,15632696017545,14306048017033,9137512120969,28345521341065,31167410864777,45292716950153',
            couponAllConfigIdOrderString:
              '45103988015753,44617127887497,45291946771081,44430111474313,44525912457865,45448001880713,44755597656713,44602983514761,45299878134409,45366598042249,44769143751305,45406499832457,44665315328649,35503293858441,35506573542025,35506322080393,35364990026377,35371666506377,8650758750857,15632696017545,14306048017033,9137512120969,28345521341065,31167410864777,45292716950153',
            ctype: 'h5',
            platform: 3,
            app: -1,
            h5Fingerprint:
              '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',
          }),
          headers: {
            'Content-Type': 'application/json',
            Cookie: `token=${token}`,
          },
        },
      );
      const result = await res.json();
      console.log('🚀 ~ KeyCardsService ~ getCoupon1 ~ result:', result);
      if (result?.code === 0) {
        const couponData = result.data.allCoupons
          .filter((item: any) => item.jumppageType === 8)
          .map((item: any) => {
            const user = item.useCondition.match(/\d{3}\*\*\*\*\d{4}/g)[0];
            return {
              text: `${item.couponName}|${item.amountLimit.match(/\d+/g)[0]}-${item.couponAmount}`,
              color: 'text-green-600',
              user,
            };
          });

        return couponData;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  async getCoupon2(token: string) {
    try {
      const res = await fetch(
        'https://mediacps.meituan.com/gundam/gundamGrabV4?gdBs=0000&pageVersion=1753684717744&yodaReady=h5&csecplatform=4&csecversion=3.2.1',
        {
          method: 'POST',
          body: JSON.stringify({
            gundamId: 567871,
            instanceId: '17507780765510.30596112212390103',
            actualLongitude: 114174328,
            actualLatitude: 22316555,
            needTj: false,
            couponConfigIdOrderCommaString:
              '1333897255,1470149937,1930959778,1653365363,1703895443,1726487817,1253454975,1461317209,1437320701,1182630451',
            couponAllConfigIdOrderString:
              '1333897255,1470149937,1930959778,1653365363,1703895443,1726487817,1253454975,1461317209,1437320701,1182630451',
            ctype: 'h5',
            platform: 3,
            app: -1,
            h5Fingerprint:
              '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',
          }),
          headers: {
            'Content-Type': 'application/json',
            Cookie: `token=${token}`,
          },
        },
      );
      const result = await res.json();
      if (result?.code === 0) {
        const couponData = result.data.allCoupons
          .filter((item: any) => item.jumppageType === 8)
          .map((item: any) => {
            const user = item.useCondition.match(/\d{3}\*\*\*\*\d{4}/g)[0];
            return {
              text: `${item.couponName}|${item.amountLimit.match(/\d+/g)[0]}-${item.couponAmount}`,
              color: 'text-green-600',
              user,
            };
          });

        return couponData;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }
}
