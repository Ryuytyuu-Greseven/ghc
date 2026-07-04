import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SendOtpDto {
  /**
   * Either a username or a registered email address.
   * The service resolves which one was supplied via '@' detection.
   */
  @IsString()
  @IsNotEmpty({ message: 'Username or email identifier is required' })
  @MaxLength(255)
  identifier: string;
}
