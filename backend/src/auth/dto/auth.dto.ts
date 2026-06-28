import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsEmail() email!: string;
  @IsString() username!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsString() phone?: string;
}

export class LoginDto {
  @IsString() identifier!: string;
  @IsString() password!: string;
}

export class RefreshDto {
  @IsOptional() @IsString() refreshToken?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

export class PasswordResetRequestDto {
  @IsEmail() email!: string;
}

export class PasswordResetConfirmDto {
  @IsEmail() email!: string;
  @IsString() code!: string;
  @IsString() @MinLength(8) newPassword!: string;
}

export class GoogleLoginDto {
  @IsString() accessToken!: string;
}

export class AppleLoginDto {
  @IsString() identityToken!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
}
