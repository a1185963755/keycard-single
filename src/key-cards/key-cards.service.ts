import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { KeyCard, KeyCardStatus } from './entities/key-card.entity';
import { Batch } from './entities/batch.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { randomBytes } from 'crypto';
import axios from 'axios';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { getH5Fingerprint } from './util/h5Fingerprint';

@Injectable()
export class KeyCardsService {
  constructor(
    @InjectRepository(KeyCard)
    private keyCardRepository: Repository<KeyCard>,
    @InjectRepository(Batch)
    private batchRepository: Repository<Batch>,
    private configService: ConfigService,
  ) {}

  // 验证卡密
  async getCoupon(mtToken: string, userId: string, code: string) {
    const keyCard = await this.keyCardRepository.findOne({
      where: { code },
    });

    if (!keyCard) {
      throw new NotFoundException('卡密不存在');
    }

    // 检查卡密是否已被使用;
    if (keyCard.status === KeyCardStatus.USED) {
      return {
        ...keyCard,
        coupon_info: JSON.parse(keyCard.coupon_info),
      };
    }

    const couponData = await Promise.all([
      this.getCoupon1(mtToken, userId),
      this.getCoupon2(mtToken, userId),
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
    keyCard.userId = userId;
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

  // 获取所有卡密ck
  private async getAllKeycards() {
    const keyCards = await this.keyCardRepository.find({
      where: {
        meituan_token: Not(IsNull()),
      },
      select: {
        meituan_token: true,
        userId: true,
      },
    });
    if (keyCards.length === 0) {
      return [];
    }
    const result = keyCards.map((item) => {
      return {
        meituan_token: item.meituan_token,
        userId: item.userId,
      };
    });
    return result;
  }
  @Cron('0 8 * * *')
  private async getCouponEveryday() {
    const reportUrl = this.configService.get('XZ_URL');
    if (!reportUrl) {
      return;
    }
    const keyCards = await this.getAllKeycards();
    const completeData: any[] = [];
    for (const keyCard of keyCards) {
      const res = await Promise.all([
        this.getCoupon1(keyCard.meituan_token, keyCard.userId),
        this.getCoupon2(keyCard.meituan_token, keyCard.userId),
      ]);
      if (res[0].length > 0 || res[1].length > 0) {
        completeData.push(keyCard.userId);
      }
    }
    const sendReport = await axios.post(reportUrl, {
      title: `领券成功${completeData.length}个`,
      content: completeData.join('\n'),
      date: null,
      time: null,
      type: null,
    });
    return sendReport;
  }

  async getCoupon1(token: string, userId: string) {
    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        let activityUrl = '';
        if (Math.random() > 0.5) {
          activityUrl = `https://market.waimai.meituan.com/gd/single.html?el_biz=waimai&el_page=gundam.loader&gundam_id=2KAWnD&activity_id=380797&utm_source=60413&utm_medium=weixin_mp&utm_campaign=other&utm_content=1950913880955940889_7&utm_term=&channel=union&mt_id=ho15Le-Rd&mt_key=1681ca2fae8a7d4161b6d731aa6f876b&click_cps_url=https%3A%2F%2Fclick.meituan.com%2Ft%3Ft%3D1%26c%3D2%26p%3DZMFH_b9zNSo4&risk_partner=587&risk_app=216&risk_platform=3&userId=${userId}&token=${token}`;
        } else {
          activityUrl = `${this.configService.get('ACTIVITY_URL1')}&userId=${userId}&token=${token}`;
        }
        const h5Fingerprint = getH5Fingerprint(activityUrl);
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
              h5Fingerprint,
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

          // 如果 couponData 长度不为 0，直接返回
          if (couponData.length > 0) {
            return couponData;
          }

          // 如果 couponData 长度为 0 且还有重试次数，继续重试
          if (retryCount < maxRetries) {
            retryCount++;
            // 可以添加一些延迟，避免请求过于频繁
            continue;
          }

          // 如果重试次数用完，返回空数组
          return [];
        } else {
          // 如果 result.code 不为 0 且还有重试次数，继续重试
          if (retryCount < maxRetries) {
            retryCount++;
            continue;
          }
          return [];
        }
      } catch (error) {
        // 如果发生错误且还有重试次数，继续重试
        if (retryCount < maxRetries) {
          retryCount++;
          continue;
        }
        return [];
      }
    }

    return [];
  }

  async getCoupon2(token: string, userId: string) {
    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        const activityUrl = `${this.configService.get('ACTIVITY_URL2')}&userId=${userId}&token=${token}`;
        const h5Fingerprint = getH5Fingerprint(activityUrl);
        const res = await fetch(
          'https://mediacps.meituan.com/gundam/gundamGrabV4?gdBs=0000&pageVersion=1753888159249&yodaReady=h5&csecplatform=4&csecversion=3.2.1',
          {
            method: 'POST',
            body: JSON.stringify({
              gundamId: 555683,
              instanceId: '17287240729850.22156150354269322',
              actualLongitude: 0,
              actualLatitude: 0,
              needTj: true,
              couponConfigIdOrderCommaString: '45535197397641',
              couponAllConfigIdOrderString: '45535197397641',
              ctype: 'h5',
              platform: 3,
              app: -1,
              h5Fingerprint,
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

          // 如果 couponData 长度不为 0，直接返回
          if (couponData.length > 0) {
            return couponData;
          }

          // 如果 couponData 长度为 0 且还有重试次数，继续重试
          if (retryCount < maxRetries) {
            retryCount++;
            // 可以添加一些延迟，避免请求过于频繁
            continue;
          }

          // 如果重试次数用完，返回空数组
          return [];
        } else {
          // 如果 result.code 不为 0 且还有重试次数，继续重试
          if (retryCount < maxRetries) {
            retryCount++;
            continue;
          }
          return [];
        }
      } catch (error) {
        // 如果发生错误且还有重试次数，继续重试
        if (retryCount < maxRetries) {
          retryCount++;
          continue;
        }
        return [];
      }
    }

    return [];
  }
}
