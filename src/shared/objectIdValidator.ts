import z from "zod";

// reusable object id validator
export const objectId = (fieldName: string) => z.string({ required_error: `${fieldName} is required` }).regex(/^[0-9a-fA-F]{24}$/, `${fieldName} must be a valid object id`);