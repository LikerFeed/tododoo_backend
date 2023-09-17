import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { QueryUserDto } from './dtos/query-user.dto';
import { SigninUserDto } from './dtos/signin-user.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { UpdateUserPipe } from './pipes/update-user.pipe';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Get('/me')
  @UseGuards(AuthGuard)
  getUser(@Request() req) {
    return this.userService.findOne(req.user.sub);
  }

  //Make this route to show only basic info about users
  @Get('/')
  @UseGuards(AuthGuard)
  getUsers(@Query() query: QueryUserDto) {
    return this.userService.find(query);
  }

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() body: CreateUserDto) {
    return this.authService.signup(body);
  }

  @Post('/signin')
  signIn(@Body() body: SigninUserDto) {
    return this.authService.signin(body.email, body.password);
  }

  @Patch('/')
  @UseGuards(AuthGuard)
  updateUser(
    @CurrentUser() userId: string,
    @Body(UpdateUserPipe) body: UpdateUserDto,
  ) {
    return this.userService.update(userId, body);
  }

  @Delete('/')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeUser(@CurrentUser() userId: string) {
    return this.userService.remove(userId);
  }

  @Post('/password')
  @UseGuards(AuthGuard)
  changePassword(
    @CurrentUser() userId: string,
    @Body() passwords: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, passwords);
  }
}
