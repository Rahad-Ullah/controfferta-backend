import { Schema } from 'mongoose';
import { Counter } from '../app/modules/counter/counter.model';

/**
 * Auto Increment Plugin for Mongoose
 * 
 * This plugin automatically increments a counter for a specific field in a document
 * when the document is created.
 * 
 * @param schema - The schema to apply the plugin to
 * @param options - The options for the plugin
 * 
 * @example
 * autoIncrementPlugin(userSchema, {
 *   incField: 'uid',
 *   prefix: 'USR',
 *   counterId: 'user_counter',
 *   padLength: 4
 * });
 */

interface AutoIncrementOptions {
    incField: string;     // Field name: 'uid'
    prefix: string;       // Prefix: 'USR'
    counterId: string;    // Unique key for the counter collection
    padLength?: number;   // How many digits (default is 4)
}

export const autoIncrementPlugin = <T>(schema: Schema<T>, options: AutoIncrementOptions) => {
    schema.pre('save', async function (next) {
        const doc = this as any;

        if (doc.isNew) {
            try {
                const counter = await Counter.findOneAndUpdate(
                    { id: options.counterId },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );

                if (!counter) {
                    throw new Error("Failed to generate sequence counter.");
                }

                // Convert sequence to string and pad with zeros
                const sequenceNumber = counter.seq.toString().padStart(options.padLength || 4, '0');

                // Final Result: USR-0001
                doc[options.incField] = `${options.prefix}-${sequenceNumber}`;

                next();
            } catch (error) {
                next(error as any);
            }
        } else {
            next();
        }
    });
};