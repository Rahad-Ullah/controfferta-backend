import { randomInt } from 'crypto';

const generateOTP = (digitLength: number) => {
  const min = 10 ** (digitLength - 1);
  const max = 10 ** digitLength;

  return randomInt(min, max);
};

export default generateOTP;
