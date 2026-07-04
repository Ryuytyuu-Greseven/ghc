import { IsString, IsNotEmpty, Length, MinLength, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  /**
   * Either a username or a registered email address.
   */
  @IsString()
  @IsNotEmpty({ message: 'Username or email identifier is required' })
  @MaxLength(255)
  identifier: string;

  /**
   * The 6-digit OTP sent to the user's registered email.
   */
  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  /**
   * The new password to set after successful OTP verification.
   */
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @MaxLength(128)
  newPassword: string;
}
