import type { NextFunction, Request, Response } from "express";
import { BadRequestException } from "../common/exceptions";
import { ZodError, ZodType } from "zod";


type keyReqType = "body" | "query" | "params" | "files"
// type schemaType = Record<keyReqType, ZodType>
type schemaType = Partial<Record<keyReqType, ZodType>>

type IssuesType = Array<{
            key: keyReqType;
            issues: Array<{
                path: (symbol |string | number | null | undefined)[];
                message: string
            }>
}>


export const validation = (schema: schemaType) => { 

    return (req: Request, res: Response, next: NextFunction) => {
        // console.log(Object.keys(schema));

        const issues: IssuesType = []

        for (const key of Object.keys(schema) as keyReqType[]) {

           if(!schema[key]) continue;  // Skip this iteration if the schema for the current key is not defined

            const validationResult = schema[key].safeParse((req as any)[key] );
            if (!validationResult.success) {
                const error = validationResult.error as ZodError;
                console.log({error});
                issues.push({
                    key,
                    issues: error.issues.map((issue) => ({
                        path: [key, ...issue.path],
                        message: issue.message,
                    }))
                })
            }
        }

        if (issues.length > 0) {
            throw new BadRequestException("Validation failed", { error: issues });
        }

        
        next()
    }
}