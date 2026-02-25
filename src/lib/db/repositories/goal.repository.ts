import { prisma, handlePrismaError } from '../prisma';
import type { Goal, Prisma, GoalType, AssetType } from '@prisma/client';

export type CreateGoalInput = {
  personId?: string;
  name: string;
  type: GoalType;
  targetValue: number;
  deadline?: Date | string;
  assetSymbol?: string;
  assetType?: AssetType;
};

export type UpdateGoalInput = Partial<CreateGoalInput> & {
  currentValue?: number;
  isCompleted?: boolean;
};

export type GoalWithPerson = Goal & {
  person: { id: string; name: string; color: string } | null;
};

const includeRelations = {
  person: { select: { id: true, name: true, color: true } },
};

export class GoalRepository {
  async findAll(userId: string): Promise<GoalWithPerson[]> {
    try {
      return await prisma.goal.findMany({
        where: { userId },
        include: includeRelations,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findById(id: string, userId: string): Promise<GoalWithPerson | null> {
    try {
      return await prisma.goal.findFirst({
        where: { id, userId },
        include: includeRelations,
      });
    } catch (error) {
      console.error('Error fetching goal:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findByPersonId(userId: string, personId: string): Promise<GoalWithPerson[]> {
    try {
      return await prisma.goal.findMany({
        where: { userId, personId },
        include: includeRelations,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching goals by person:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async create(userId: string, data: CreateGoalInput): Promise<GoalWithPerson> {
    try {
      return await prisma.goal.create({
        data: {
          userId,
          personId: data.personId,
          name: data.name,
          type: data.type,
          targetValue: data.targetValue,
          deadline: data.deadline ? new Date(data.deadline) : undefined,
          assetSymbol: data.assetSymbol,
          assetType: data.assetType,
        },
        include: includeRelations,
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async update(id: string, userId: string, data: UpdateGoalInput): Promise<GoalWithPerson> {
    try {
      const existing = await prisma.goal.findFirst({ where: { id, userId } });
      if (!existing) throw new Error('Goal not found');

      const updateData: Prisma.GoalUncheckedUpdateInput = {};
      if (data.personId !== undefined) updateData.personId = data.personId;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
      if (data.currentValue !== undefined) updateData.currentValue = data.currentValue;
      if (data.deadline !== undefined) {
        updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      }
      if (data.assetSymbol !== undefined) updateData.assetSymbol = data.assetSymbol;
      if (data.assetType !== undefined) updateData.assetType = data.assetType;
      if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted;

      return await prisma.goal.update({
        where: { id },
        data: updateData,
        include: includeRelations,
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const existing = await prisma.goal.findFirst({ where: { id, userId } });
      if (!existing) throw new Error('Goal not found');

      await prisma.goal.delete({ where: { id } });
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findIncomplete(userId: string): Promise<GoalWithPerson[]> {
    try {
      return await prisma.goal.findMany({
        where: { userId, isCompleted: false },
        include: includeRelations,
        orderBy: { deadline: 'asc' },
      });
    } catch (error) {
      console.error('Error fetching incomplete goals:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async markCompleted(id: string, userId: string): Promise<GoalWithPerson> {
    return this.update(id, userId, { isCompleted: true });
  }

  async updateProgress(id: string, userId: string, currentValue: number): Promise<GoalWithPerson> {
    const goal = await this.findById(id, userId);
    if (!goal) throw new Error('Goal not found');

    const isCompleted = currentValue >= Number(goal.targetValue);
    return this.update(id, userId, { currentValue, isCompleted });
  }
}

export const goalRepository = new GoalRepository();
