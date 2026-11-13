import { StatusCodes } from "http-status-codes";
import { Wallet } from "./wallet.model";
import ApiError from "src/errors/ApiError";

// ----------------- deduct wallet available balance -----------------
const deductWalletAvailableBalance = async (walletId: string, amountUSD: number) => {
    const updatedWallet = await Wallet.findByIdAndUpdate(
        walletId,
        { $inc: { availableBalance: -amountUSD } },
        { new: true },
    );
    if (!updatedWallet) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to deduct wallet available balance');
    }
    return updatedWallet;
};

// ----------------- revert wallet available balance -----------------
const revertWalletAvailableBalance = async (walletId: string, amountUSD: number) => {
    const updatedWallet = await Wallet.findByIdAndUpdate(
        walletId,
        { $inc: { availableBalance: amountUSD } },
        { new: true },
    );
    if (!updatedWallet) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to revert wallet available balance');
    }
    return updatedWallet;
};

export const walletServiceHelper = {
    deductWalletAvailableBalance,
    revertWalletAvailableBalance,
};