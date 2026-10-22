import { Examination } from '../models/Examination.js';
import { ExamParticipation } from '../models/ExamParticipation.js';
import { Result } from '../models/Result.js';
import { ApiError } from '../utils/ApiError.js';

class ExaminationService {
  /**
   * Determine grade based on percentage
   */
  calculateGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }

  /**
   * Verify if a student is eligible to take an exam
   */
  async verifyStudentEligibility(examinationId, student) {
    const exam = await Examination.findOne({
      _id: examinationId,
      isDeleted: { $ne: true }
    }).populate('course', 'name code');

    if (!exam) {
      throw ApiError.notFound('Examination not found');
    }

    if (student.status !== 'active') {
      throw ApiError.forbidden('Your student account is inactive. You cannot take examinations.');
    }

    // Verify course match
    const examCourseId = exam.course._id ? exam.course._id.toString() : exam.course.toString();
    const studentCourseId = student.course._id ? student.course._id.toString() : student.course.toString();

    if (examCourseId !== studentCourseId) {
      throw ApiError.forbidden('You are not enrolled in the course assigned to this examination');
    }

    // Verify batch match if specific batches specified (case-insensitive & trimmed)
    if (exam.targetBatches && exam.targetBatches.length > 0) {
      const studentBatch = (student.batch || '').trim().toLowerCase();
      const hasMatchingBatch = exam.targetBatches.some((b) => b && b.trim().toLowerCase() === studentBatch);
      if (!hasMatchingBatch) {
        throw ApiError.forbidden(
          `This examination is only for batches: ${exam.targetBatches.join(', ')}. Your batch is ${student.batch}.`
        );
      }
    }

    const now = new Date();
    if (exam.status === 'draft' || exam.status === 'cancelled') {
      throw ApiError.badRequest(`This examination is currently in ${exam.status} state and is not accessible.`);
    }

    if (now < new Date(exam.startDate)) {
      throw ApiError.badRequest(`This examination has not started yet. Starts on: ${new Date(exam.startDate).toISOString()}`);
    }

    // Check previous attempts
    const attempts = await ExamParticipation.find({
      examination: exam._id,
      student: student._id
    });

    const activeAttempt = attempts.find((a) => a.status === 'in-progress');
    const completedAttempts = attempts.filter((a) => a.status === 'submitted' || a.status === 'timed-out');

    if (completedAttempts.length >= exam.maxAttempts && !activeAttempt) {
      throw ApiError.forbidden(
        `Maximum attempt limit reached (${exam.maxAttempts}). You have already submitted ${completedAttempts.length} attempt(s).`
      );
    }

    if (now > new Date(exam.endDate) && completedAttempts.length >= exam.maxAttempts && !activeAttempt) {
      throw ApiError.badRequest(`This examination has already ended on: ${new Date(exam.endDate).toISOString()}`);
    }

    return { exam, activeAttempt, totalAttempts: attempts.length };
  }

  /**
   * Evaluate answers, calculate negative marks, auto-submission status, and return complete score breakdown
   */
  async evaluateAndSubmit(examination, participation, submittedAnswers = [], isClientAutoSubmit = false) {
    const questionMap = new Map();
    examination.questions.forEach((q) => {
      questionMap.set(q._id.toString(), q);
    });

    const totalQuestions = examination.questions.length;
    let totalAttempted = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let positiveMarks = 0;
    let negativeMarksDeducted = 0;

    const evaluatedAnswers = [];
    const submittedMap = new Map();

    // 1. Populate with existing autosaved answers first
    if (participation.answers && Array.isArray(participation.answers)) {
      participation.answers.forEach((ans) => {
        if (ans && ans.questionId && ans.selectedOptionIndex !== null && ans.selectedOptionIndex !== undefined) {
          submittedMap.set(ans.questionId.toString(), ans.selectedOptionIndex);
        }
      });
    }

    // 2. Override with any submitted answers payload
    submittedAnswers.forEach((ans) => {
      if (ans && ans.questionId) {
        submittedMap.set(ans.questionId.toString(), ans.selectedOptionIndex);
      }
    });

    // Evaluate each question in the examination
    for (const question of examination.questions) {
      const qIdStr = question._id.toString();
      const selectedOptionIndex = submittedMap.has(qIdStr) ? submittedMap.get(qIdStr) : null;
      const isAttempted = selectedOptionIndex !== null && selectedOptionIndex !== undefined;

      let isCorrect = false;
      let marksAwarded = 0;
      let questionNegative = 0;

      if (isAttempted) {
        totalAttempted++;
        if (Number(selectedOptionIndex) === Number(question.correctOptionIndex)) {
          isCorrect = true;
          totalCorrect++;
          const qMark = question.marks || 1;
          marksAwarded = qMark;
          positiveMarks += qMark;
        } else {
          totalWrong++;
          // Apply question-specific negative marks or exam-level default negative marks if configured
          const configuredNeg = question.negativeMarks !== undefined && question.negativeMarks !== null && question.negativeMarks > 0
            ? question.negativeMarks
            : (examination.negativeMarks || 0);

          if (configuredNeg > 0) {
            questionNegative = configuredNeg;
            marksAwarded = -configuredNeg;
            negativeMarksDeducted += configuredNeg;
          }
        }

        evaluatedAnswers.push({
          questionId: question._id,
          selectedOptionIndex: Number(selectedOptionIndex),
          isAttempted: true,
          isCorrect,
          marksAwarded,
          negativeMarksDeducted: questionNegative
        });
      } else {
        evaluatedAnswers.push({
          questionId: question._id,
          selectedOptionIndex: null,
          isAttempted: false,
          isCorrect: false,
          marksAwarded: 0,
          negativeMarksDeducted: 0
        });
      }
    }

    const totalUnattempted = totalQuestions - totalAttempted;
    const rawTotalScore = positiveMarks - negativeMarksDeducted;
    const finalScore = Number(Math.max(0, rawTotalScore).toFixed(2));

    // Check duration and auto-submit
    const elapsedMinutes = Math.max(
      1,
      Math.round((Date.now() - new Date(participation.startTime).getTime()) / (60 * 1000))
    );
    const durationAllowed = examination.durationMinutes || 60;
    const isOverdue = elapsedMinutes > durationAllowed + 2; // 2 min network buffer
    const isAutoSubmitted = isClientAutoSubmit || isOverdue;

    // Update participation record
    participation.answers = evaluatedAnswers;
    participation.totalQuestions = totalQuestions;
    participation.totalAttempted = totalAttempted;
    participation.totalCorrect = totalCorrect;
    participation.totalWrong = totalWrong;
    participation.totalUnattempted = totalUnattempted;
    participation.positiveMarks = Number(positiveMarks.toFixed(2));
    participation.negativeMarksDeducted = Number(negativeMarksDeducted.toFixed(2));
    participation.totalScore = finalScore;
    participation.submitTime = new Date();
    participation.durationUsedMinutes = Math.min(elapsedMinutes, durationAllowed);
    participation.status = 'submitted';
    participation.isAutoSubmitted = isAutoSubmitted;
    participation.isEvaluated = true;
    await participation.save();

    // Calculate percentage and pass status
    const percentage = Number(((finalScore / (examination.totalMarks || 1)) * 100).toFixed(2));
    const isPassed = finalScore >= examination.passingMarks;
    const grade = this.calculateGrade(percentage);

    // Create or update result
    const result = await Result.findOneAndUpdate(
      { participation: participation._id },
      {
        examination: examination._id,
        student: participation.student,
        participation: participation._id,
        course: examination.course,
        batch: participation.batch,
        totalQuestions,
        totalAttempted,
        totalCorrect,
        totalWrong,
        totalUnattempted,
        totalMarks: examination.totalMarks,
        positiveMarks: Number(positiveMarks.toFixed(2)),
        negativeMarksDeducted: Number(negativeMarksDeducted.toFixed(2)),
        obtainedMarks: finalScore,
        percentage,
        isPassed,
        grade,
        status: 'unpublished'
      },
      { upsert: true, returnDocument: 'after' }
    );

    return {
      participation,
      result,
      breakdown: {
        totalQuestions,
        totalAttempted,
        totalCorrect,
        totalWrong,
        totalUnattempted,
        totalMarks: examination.totalMarks,
        positiveMarks: Number(positiveMarks.toFixed(2)),
        negativeMarksDeducted: Number(negativeMarksDeducted.toFixed(2)),
        obtainedMarks: finalScore,
        percentage,
        isPassed,
        grade,
        isAutoSubmitted,
        durationUsedMinutes: participation.durationUsedMinutes
      }
    };
  }

  /**
   * Auto-save a single answer selection or review flag in real time
   */
  async saveQuestionAnswer(participation, { questionId, selectedOptionIndex, isMarkedForReview }) {
    if (participation.status !== 'in-progress') {
      throw ApiError.badRequest('Cannot save answers. Examination attempt is not in progress.');
    }

    const qIdStr = questionId.toString();
    const existingIndex = participation.answers.findIndex(
      (a) => a.questionId.toString() === qIdStr
    );

    const isAttempted = selectedOptionIndex !== null && selectedOptionIndex !== undefined;

    if (existingIndex >= 0) {
      if (selectedOptionIndex !== undefined) {
        participation.answers[existingIndex].selectedOptionIndex = isAttempted ? Number(selectedOptionIndex) : null;
        participation.answers[existingIndex].isAttempted = isAttempted;
      }
      if (isMarkedForReview !== undefined) {
        participation.answers[existingIndex].isMarkedForReview = Boolean(isMarkedForReview);
      }
    } else {
      participation.answers.push({
        questionId,
        selectedOptionIndex: isAttempted ? Number(selectedOptionIndex) : null,
        isAttempted,
        isMarkedForReview: Boolean(isMarkedForReview)
      });
    }

    // Dynamically update real-time attempted & unattempted counts
    const attemptedCount = participation.answers.filter((a) => a.isAttempted).length;
    participation.totalAttempted = attemptedCount;
    participation.totalUnattempted = Math.max(0, (participation.totalQuestions || participation.answers.length) - attemptedCount);

    await participation.save();
    return participation;
  }
}

export const examinationService = new ExaminationService();
