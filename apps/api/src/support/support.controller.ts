import { RouteAccess } from '@douglasneuroinformatics/libnest';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SupportService } from './support.service';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @RouteAccess('public')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.supportService.sendForgotPasswordEmail(dto.identifier);
  }
}
