import { ValidationSchema } from '@douglasneuroinformatics/libnest';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod/v4';

export const $ForgotPasswordDto = z.object({
  identifier: z.string().min(1)
});

export type ForgotPasswordDtoType = z.infer<typeof $ForgotPasswordDto>;

@ValidationSchema($ForgotPasswordDto)
export class ForgotPasswordDto implements ForgotPasswordDtoType {
  @ApiProperty()
  identifier: string;
}
