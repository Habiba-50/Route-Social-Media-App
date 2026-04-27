
import { Types } from 'mongoose';
import { z } from 'zod';

export const generalValidationFields = {
  email: z.email(),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z]){1,}(?=.*[A-Z]){1,}(?=.*\d){1,}(?=.*\W)[\w\W\d].{8,25}$/,
      {
        error:
          "Password must be 8-25 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character",
      },
    ),
  username: z
    .string({ error: "Username is mandatory" })
    .min(2, { error: "min is 2 characters" })
    .max(25, { error: "max is 25 characters" }),
  confirmPassword: z.string(),
  phone: z
    .string({ error: "phone is required" })
    .regex(/^(02|2|\+2)?01[0-25]\d{8}$/),
  // gender: z.enum(["male", "female "], { error: "Invalid gender" })

  otp: z
    .string({ error: "OTP is required" })
    .regex(/^\d{6}$/, { error: "OTP must be 6 digits" }),
  
  id: z.string().refine((id) => Types.ObjectId.isValid(id), { error: "Invalid ID" }),

  content: z.string().min(2, { error: "Content is too short" }).max(1000, { error: "Content is too long" }).optional(),
};

