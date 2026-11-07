import ApiError from "../errors/ApiError";
import { StatusCodes } from "http-status-codes";

export const generateSlug = (title: string): string => {
    if (!title || title.trim() === '' || typeof title !== 'string') {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Title is required');
    }
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s\d\-가-힣ㄱ-ㅎㅏ-ㅣぁ-んァ-ヶー一-龠\u0980-\u09FF]/g, '') // Keeps alphanumerics, spaces, dashes, and Bengali/CJK characters
        .replace(/[\s_]+/g, '-') // Replaces spaces and underscores with a single dash
        .replace(/\-+/g, '-') // Collapses consecutive dashes
        .replace(/^-+|-+$/g, ''); // Removes leading or trailing dashes
};