import { RouteAccess } from '@douglasneuroinformatics/libnest';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller({ path: 'health' })
export class HealthController {
  @ApiOperation({
    description: 'Check if the API is running',
    summary: 'Health Check'
  })
  @Get()
  @RouteAccess('public')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
