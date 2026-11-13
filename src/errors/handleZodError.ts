import { ZodError } from 'zod';
import { IErrorMessage } from '../types/errors.types';

const handleZodError = (error: ZodError) => {
  const errorMessages: IErrorMessage[] = error.issues.map(el => {
    const field = el.path[el.path.length - 1];
    return {
      path: typeof field === 'number' ? field : String(field ?? ''),
      message: el.message,
    };
  });

  const statusCode = 400;
  return {
    statusCode,
    message: 'Validation Error',
    errorMessages,
  };
};

export default handleZodError;
