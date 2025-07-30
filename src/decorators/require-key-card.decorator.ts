import { SetMetadata } from '@nestjs/common';

export const KEY_CARD_VERIFICATION_KEY = 'require_key_card';

export const RequireKeyCard = () =>
  SetMetadata(KEY_CARD_VERIFICATION_KEY, true);
