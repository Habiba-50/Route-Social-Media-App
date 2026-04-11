import { z } from 'zod';
import { generalValidationFields } from '../../common/validation';
import { GenderEnum } from '../../common/enums';

export const login = {
    body: z.strictObject({
        email: generalValidationFields.email,
        password: generalValidationFields.password,
    }).catchall(z.string())
}

export const signup = {
    body: login.body.safeExtend({
        username: generalValidationFields.username,
        phone:generalValidationFields.phone,
        confirmPassword: generalValidationFields.confirmPassword,
        gender: z.enum(GenderEnum, { error: "Invalid gender" }),
    }).refine((data) => {
        return data.password === data.confirmPassword
    } , {
        error: "Passwords don't match",   
    }),

    query : z.strictObject({
        flag: z.coerce.boolean()
    })
}

export const confirmEmail = {
    body: z.strictObject({
        email: generalValidationFields.email,
        otp: generalValidationFields.otp,
    }).catchall(z.string())
}

export const email = {
    body: z.strictObject({
        email: generalValidationFields.email,
    }).catchall(z.string())
}

export const resetPassword = {
    body: z.strictObject({
        email: generalValidationFields.email,
        password: generalValidationFields.password,
        confirmPassword: generalValidationFields.confirmPassword,
    }).catchall(z.string()).refine((data) => {
        return data.password === data.confirmPassword
    } , {
        error: "Passwords don't match",   
    })
}