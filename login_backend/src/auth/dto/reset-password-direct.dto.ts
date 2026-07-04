import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDirectDto {
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(100)
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Old password is required' })
  oldPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @MaxLength(128)
  newPassword: string;
}
