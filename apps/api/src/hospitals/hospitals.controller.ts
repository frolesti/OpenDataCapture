import { CurrentUser, RouteAccess, ValidationSchema } from '@douglasneuroinformatics/libnest';
import { Body, Controller, ForbiddenException, Param, Patch } from '@nestjs/common';
import { $HospitalOption } from '@opendatacapture/schemas/group';
import type { User } from '@prisma/client';

import { HospitalsService } from './hospitals.service';

@ValidationSchema($HospitalOption.pick({ name: true }))
class RenameHospitalDto {
  name: string;
}

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Patch(':id')
  @RouteAccess({ action: 'update', subject: 'Group' })
  rename(@Param('id') id: string, @Body() data: RenameHospitalDto, @CurrentUser() user: User) {
    if (user.basePermissionLevel !== 'ADMIN') {
      throw new ForbiddenException('Només un administrador pot canviar el nom d’un centre del catàleg compartit.');
    }
    return this.hospitalsService.rename(id, data.name);
  }
}
