export const sendSuccess = (res, statusCode = 200, data = {}, message = 'Success') => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const sendError = (res, statusCode = 400, message = 'Error') => {
  return res.status(statusCode).json({ success: false, message });
};
