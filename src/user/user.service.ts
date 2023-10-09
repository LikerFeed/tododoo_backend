import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common/exceptions';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { Types, Model } from 'mongoose';

import { User } from './user.schema';
import { Task } from 'src/task/task.schema';
import { Category } from 'src/category/category.schema';
import { CreateUserDto } from './dtos/create-user.dto';
import { QueryUserDto } from './dtos/query-user.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

const scrypt = promisify(_scrypt);

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  findOne(id: string): Promise<User> {
    return this.userModel.findById(id).select('-__v');
    // .populate({
    //   path: 'tasks',
    //   populate: {
    //     path: 'categories',
    //   },
    // })
    // .populate('categories', 'avatar')
    // .exec();
  }

  find(query: QueryUserDto): Promise<User[]> {
    return this.userModel
      .find(query)
      .select(['-email', '-categories', '-tasks', '-__v']);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const [foundUser] = await this.find({
      email: createUserDto.email,
    } as QueryUserDto);
    if (foundUser) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await this.hashPassword(createUserDto.password);

    return this.userModel.create({
      ...createUserDto,
      _id: new Types.ObjectId(),
      password: hashedPassword,
    });
  }

  async update(id: string, attrs: Partial<User>): Promise<User> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, attrs, {
        new: true,
      })
      .select(['-password', '-tasks', '-categories', '-__v']);

    if (!updatedUser) throw new NotFoundException('User not found');

    return updatedUser;
  }

  async remove(id: string) {
    const deletedUser = await this.userModel.findByIdAndDelete(id);

    if (deletedUser) {
      await this.taskModel.deleteMany({ userId: deletedUser._id });
      await this.categoryModel.deleteMany({ userId: deletedUser._id });
    }

    return;
  }

  async changePassword(id: string, passwords: ChangePasswordDto) {
    const { oldPassword, newPassword } = passwords;
    if (oldPassword === newPassword)
      throw new BadRequestException('Passwords cannot be the same');

    const foundUser = await this.userModel.findById(id);

    if (!foundUser) throw new NotFoundException('User not found');

    const isOldPasswordValid = await this.comparePasswords(
      foundUser.password,
      oldPassword,
    );

    if (!isOldPasswordValid)
      throw new BadRequestException('Old password is invalid');

    foundUser.password = await this.hashPassword(newPassword);
    foundUser.save();

    return;
  }

  async comparePasswords(
    hashedValidPass: string,
    comparingPass: string,
  ): Promise<boolean> {
    const [salt, storedHash] = hashedValidPass.split('.');
    const hash = ((await scrypt(comparingPass, salt, 32)) as Buffer).toString(
      'hex',
    );

    return hash === storedHash ? true : false;
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(8).toString('hex');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    const hashedPassword = salt + '.' + hash.toString('hex');

    return hashedPassword;
  }
}
