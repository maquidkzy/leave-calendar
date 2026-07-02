import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LeaveType } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  try {
    let leaves;
    if (month && year) {
      // Find leaves that overlap with this month
      const startDate = new Date(parseInt(year), parseInt(month), 1);
      const endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);

      leaves = await prisma.leave.findMany({
        where: {
          OR: [
            { startDate: { lte: endDate }, endDate: { gte: startDate } }
          ]
        },
        orderBy: { startDate: 'asc' }
      });
    } else {
      leaves = await prisma.leave.findMany({
        orderBy: { startDate: 'asc' }
      });
    }

    return NextResponse.json(leaves);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, type, startDate, endDate } = data;

    if (!name || !type || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const leave = await prisma.leave.create({
      data: {
        name,
        type: type as LeaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    });

    return NextResponse.json(leave);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
