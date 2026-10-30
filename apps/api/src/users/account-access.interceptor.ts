import { InjectModel } from '@douglasneuroinformatics/libnest';
import type { Model } from '@douglasneuroinformatics/libnest';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AccountAccessInterceptor implements NestInterceptor {
  constructor(@InjectModel('User') private readonly userModel: Model<'User'>) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) return next.handle();
    if (!('id' in user) || typeof user.id !== 'string') {
      throw new UnauthorizedException('Cal tornar a iniciar la sessió.');
    }
    const account = await this.userModel.findUnique({
      select: { basePermissionLevel: true, groupIds: true, userType: true },
      where: { id: user.id }
    });
    if (
      !account ||
      account.basePermissionLevel !== user.basePermissionLevel ||
      account.groupIds.length !== user.groups.length ||
      user.groups.some((group) => !account.groupIds.includes(group.id))
    ) {
      throw new UnauthorizedException('Els permisos del compte han canviat. Torneu a iniciar la sessió.');
    }
    Object.assign(user, { userType: account.userType });
    return next.handle();
  }
}
