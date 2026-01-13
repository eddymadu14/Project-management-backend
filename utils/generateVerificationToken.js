
import jwt from "jsonwebtoken";

export const generateVerificationToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.EMAIL_TOKEN_SECRET, { expiresIn: "1d" });
};
