import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LeaveType } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await request.json();
    const { name, type, startDate, endDate } = data;
    const { id } = await params;

    const leave = await prisma.leave.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type: type as LeaveType }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      }
    });

    return NextResponse.json(leave);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.leave.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete leave' }, { status: 500 });
  }
}
