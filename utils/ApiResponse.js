class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', pagination = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    if (pagination) {
      this.pagination = pagination;
    }
  }

  static success(res, data = null, message = 'Success', statusCode = 200, pagination = null) {
    const payload = {
      success: true,
      message,
      data
    };
    if (pagination) {
      payload.pagination = pagination;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, data = null, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }
}

export { ApiResponse };
