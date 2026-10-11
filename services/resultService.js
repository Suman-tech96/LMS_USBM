import { Result } from '../models/Result.js';
import { ApiError } from '../utils/ApiError.js';

class ResultService {
  /**
   * Publish a result
   */
  async publish(resultId, adminId) {
    const result = await Result.findOne({
      _id: resultId,
      isDeleted: { $ne: true }
    }).populate('student', 'name email studentId').populate('examination', 'title');

    if (!result) {
      throw ApiError.notFound('Result record not found');
    }

    result.status = 'published';
    result.publishedAt = new Date();
    result.publishedBy = adminId;
    await result.save();

    return result;
  }

  /**
   * Unpublish a result
   */
  async unpublish(resultId) {
    const result = await Result.findOne({
      _id: resultId,
      isDeleted: { $ne: true }
    }).populate('student', 'name email studentId').populate('examination', 'title');

    if (!result) {
      throw ApiError.notFound('Result record not found');
    }

    result.status = 'unpublished';
    result.publishedAt = null;
    result.publishedBy = null;
    await result.save();

    return result;
  }
}

export const resultService = new ResultService();
