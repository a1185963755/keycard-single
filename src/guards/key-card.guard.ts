import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { KeyCardsService } from '../key-cards/key-cards.service';
import { Reflector } from '@nestjs/core';
import { KEY_CARD_VERIFICATION_KEY } from '../decorators/require-key-card.decorator';

@Injectable()
export class KeyCardGuard implements CanActivate {
  constructor(
    private readonly keyCardsService: KeyCardsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查控制器或方法是否需要验证卡密
    const requireKeyCard = this.reflector.getAllAndOverride<boolean>(
      KEY_CARD_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果不需要验证卡密，直接放行
    if (!requireKeyCard) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const keyCardCode = request.headers['x-key-card']; // 从请求头中获取卡密

    if (!keyCardCode) {
      throw new UnauthorizedException('缺少卡密验证');
    }

    try {
      // 验证卡密
      await this.keyCardsService.findKeyCardByCode(keyCardCode);
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message || '卡密验证失败');
    }
  }
}
