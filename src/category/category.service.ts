import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Document } from 'mongoose';

import { Category } from './category.schema';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { QueryCategoryDto } from './dtos/query-category.dto';
import { User } from 'src/user/user.schema';
import { Task } from 'src/task/task.schema';

interface createdCategoryDoc {
  __v: string;
  title: string;
  color: string;
  userId: User;
}

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async findOne(userId: string, id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid ObjectId');

    const foundCategory = await this.categoryModel
      .findOne({ _id: id, userId })
      .select(['-__v']);
    if (!foundCategory) throw new NotFoundException('Category not found');

    return foundCategory;
  }

  find(userId: string, query: QueryCategoryDto): Promise<Category[]> {
    return this.categoryModel.find({ userId, ...query }).select('-__v');
  }

  async create(
    userId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const createdCategory = await this.categoryModel.create({
      userId,
      ...createCategoryDto,
    });

    await this.userModel.findByIdAndUpdate(userId, {
      $push: { categories: createdCategory._id },
    });

    const { __v, ...createdCategoryData } =
      createdCategory.toObject() as createdCategoryDoc;

    return createdCategoryData;
  }

  async update(
    userId: string,
    id: string,
    attrs: Partial<Category>,
  ): Promise<Category> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid ObjectId');

    const updatedCategory = await this.categoryModel
      .findOneAndUpdate({ _id: id, userId }, attrs, { new: true })
      .select(['-__v']);
    if (!updatedCategory) throw new NotFoundException('Category not found');

    return updatedCategory;
  }

  async remove(userId: string, id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid ObjectId');

    const deletedCategory = await this.categoryModel.findOneAndDelete({
      _id: id,
      userId,
    });

    if (deletedCategory) {
      await this.userModel.findByIdAndUpdate(userId, {
        $pull: { categories: deletedCategory._id },
      });
      await this.taskModel.updateMany(
        { categories: deletedCategory._id },
        {
          $pull: { categories: deletedCategory._id },
        },
      );
    }

    return;
  }
}
