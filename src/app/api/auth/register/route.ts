import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getErrorMessage } from '@/lib/api';
import { validateRegisterInput } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const validation = validateRegisterInput(await req.json());

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email, password, name } = validation.value;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
    });

    return NextResponse.json(
      { message: 'User registered successfully', user: { id: newUser._id, email: newUser.email, name: newUser.name } },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
