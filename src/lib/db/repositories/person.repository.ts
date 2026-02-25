import { prisma, handlePrismaError } from '../prisma';
import type { Person, Prisma } from '@prisma/client';

export type CreatePersonInput = {
  name: string;
  color: string;
  isDefault?: boolean;
};

export type UpdatePersonInput = Partial<CreatePersonInput>;

export type PersonWithHoldings = Person & {
  holdings: Array<{
    id: string;
    assetSymbol: string;
    assetName: string;
    assetType: string;
    quantity: Prisma.Decimal;
    averagePrice: Prisma.Decimal;
    totalInvested: Prisma.Decimal;
    currentPrice: Prisma.Decimal | null;
    currentValue: Prisma.Decimal | null;
    profitLoss: Prisma.Decimal | null;
    profitLossPercent: Prisma.Decimal | null;
    currency: string;
    asset: {
      symbol: string;
      name: string;
      type: string;
    };
  }>;
};

export class PersonRepository {
  async findAll(userId: string): Promise<Person[]> {
    try {
      return await prisma.person.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      console.error('Error fetching persons:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findById(id: string, userId: string): Promise<Person | null> {
    try {
      return await prisma.person.findFirst({
        where: { id, userId },
      });
    } catch (error) {
      console.error('Error fetching person:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async create(userId: string, data: CreatePersonInput): Promise<Person> {
    try {
      if (data.isDefault) {
        await prisma.person.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return await prisma.person.create({
        data: { ...data, userId },
      });
    } catch (error) {
      console.error('Error creating person:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async update(id: string, userId: string, data: UpdatePersonInput): Promise<Person> {
    try {
      if (data.isDefault) {
        await prisma.person.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const person = await prisma.person.findFirst({ where: { id, userId } });
      if (!person) throw new Error('Person not found');

      return await prisma.person.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error('Error updating person:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const person = await prisma.person.findFirst({ where: { id, userId } });
      if (!person) throw new Error('Person not found');

      await prisma.person.delete({ where: { id } });
    } catch (error) {
      console.error('Error deleting person:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findWithHoldings(id: string, userId: string): Promise<PersonWithHoldings | null> {
    try {
      return await prisma.person.findFirst({
        where: { id, userId },
        include: {
          holdings: {
            include: { asset: true },
            where: { quantity: { gt: 0 } },
            orderBy: { currentValue: 'desc' },
          },
        },
      });
    } catch (error) {
      console.error('Error fetching person with holdings:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findAllWithHoldings(userId: string): Promise<PersonWithHoldings[]> {
    try {
      return await prisma.person.findMany({
        where: { userId },
        include: {
          holdings: {
            include: { asset: true },
            where: { quantity: { gt: 0 } },
            orderBy: { currentValue: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      console.error('Error fetching persons with holdings:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async setDefault(id: string, userId: string): Promise<Person> {
    try {
      const person = await prisma.person.findFirst({ where: { id, userId } });
      if (!person) throw new Error('Person not found');

      await prisma.person.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return await prisma.person.update({
        where: { id },
        data: { isDefault: true },
      });
    } catch (error) {
      console.error('Error setting default person:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findDefault(userId: string): Promise<Person | null> {
    try {
      return await prisma.person.findFirst({
        where: { userId, isDefault: true },
      });
    } catch (error) {
      console.error('Error fetching default person:', error);
      throw new Error(handlePrismaError(error));
    }
  }
}

export const personRepository = new PersonRepository();
