import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IFaq } from './faq.interface';
import { Faq } from './faq.model';

// ----------------- create faq service -----------------
const createFaqService = async (faq: IFaq): Promise<IFaq> => {
  // check if faq already exists
  const existingFaq = await Faq.exists({ question: faq.question });
  if (existingFaq) {
    throw new ApiError(StatusCodes.CONFLICT, 'Question already exists');
  }

  const result = await Faq.create(faq);
  return result;
};

// ------------------ update faq service -----------------
const updateFaqService = async (
  id: string,
  payload: Partial<IFaq>
): Promise<IFaq> => {
  const result = await Faq.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }
  return result;
};

// ------------------ delete faq service -----------------
const deleteFaqService = async (id: string): Promise<IFaq> => {
  const result = await Faq.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }
  return result;
};

// ------------------ get faq by id service -----------------
const getFaqByIdService = async (id: string): Promise<IFaq> => {
  const result = await Faq.findById(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }
  return result;
};

// ------------------ get all faqs service -----------------
const getAllFaqsService = async (): Promise<IFaq[]> => {
  const result = await Faq.find();

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found');
  }
  return result;
};

export const FaqServices = {
  createFaqService,
  updateFaqService,
  deleteFaqService,
  getFaqByIdService,
  getAllFaqsService,
};