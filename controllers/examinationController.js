import { Examination } from '../models/Examination.js';
import { Course } from '../models/Course.js';
import { ExamParticipation } from '../models/ExamParticipation.js';
import { Result } from '../models/Result.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { examinationService } from '../services/examinationService.js';

/**
 * ==========================================
 * ADMIN EXAMINATION MANAGEMENT ENDPOINTS
 * ==========================================
 */

/**
 * @desc Create Examination
 * @route POST /api/v1/examinations
 * @access Private (Admin)
 */
export const createExamination = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    instructions,
    course,
    targetBatches,
    startDate,
    endDate,
    durationMinutes,
    totalMarks,
    passingMarks,
    negativeMarks,
    maxAttempts,
    questions,
    status,
    isPublished,
    isResultPublished,
    resultPublicationDate
  } = req.body;

  const courseDoc = await Course.findOne({ _id: course, isDeleted: { $ne: true } });
  if (!courseDoc) {
    throw ApiError.notFound('Referenced course does not exist');
  }

  // Validate questions options and bounds
  if (questions && questions.length > 0) {
    questions.forEach((q, idx) => {
      if (q.correctOptionIndex >= q.options.length) {
        throw ApiError.badRequest(
          `Question #${idx + 1} has correctOptionIndex ${q.correctOptionIndex} which is out of range for ${q.options.length} options`
        );
      }
    });
  }

  const examination = await Examination.create({
    title,
    description,
    instructions,
    course,
    targetBatches: targetBatches || [],
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    durationMinutes,
    totalMarks,
    passingMarks,
    negativeMarks: negativeMarks || 0,
    maxAttempts: maxAttempts || 1,
    totalQuestions: questions ? questions.length : 0,
    questions: questions || [],
    status: status || 'draft',
    isPublished: isPublished || false,
    isResultPublished: isResultPublished || false,
    resultPublicationDate: resultPublicationDate ? new Date(resultPublicationDate) : undefined,
    createdBy: req.admin?._id
  });

  // Link to Course
  if (!courseDoc.examinations.includes(examination._id)) {
    courseDoc.examinations.push(examination._id);
    await courseDoc.save();
  }

  const populated = await Examination.findById(examination._id).populate('course', 'name code');
  return ApiResponse.created(res, populated, 'Examination created successfully');
});

/**
 * @desc Get all examinations for admin
 * @route GET /api/v1/examinations
 * @access Private (Admin)
 */
export const getAllExaminations = asyncHandler(async (req, res) => {
  const { search, course, status, page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const query = { isDeleted: { $ne: true } };

  if (status) query.status = status;
  if (course) query.course = course;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const allowedSortFields = ['createdAt', '-createdAt', 'startDate', '-startDate', 'title', '-title', 'totalMarks'];
  const sortOption = allowedSortFields.includes(sort) ? sort : '-createdAt';

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [exams, total] = await Promise.all([
    Examination.find(query)
      .populate('course', 'name code')
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum),
    Examination.countDocuments(query)
  ]);

  const pagination = {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1
  };

  return ApiResponse.success(res, exams, 'Examinations retrieved successfully', 200, pagination);
});

/**
 * @desc Get examination details by ID (Admin)
 * @route GET /api/v1/examinations/:id
 * @access Private (Admin)
 */
export const getExaminationById = asyncHandler(async (req, res) => {
  const exam = await Examination.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true }
  }).populate('course', 'name code category batches');

  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  return ApiResponse.success(res, exam, 'Examination details retrieved');
});

/**
 * @desc Update examination
 * @route PATCH /api/v1/examinations/:id
 * @access Private (Admin)
 */
export const updateExamination = asyncHandler(async (req, res) => {
  const exam = await Examination.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  const {
    title,
    description,
    instructions,
    course,
    targetBatches,
    startDate,
    endDate,
    durationMinutes,
    totalMarks,
    passingMarks,
    negativeMarks,
    maxAttempts,
    questions,
    status,
    isPublished,
    isResultPublished,
    resultPublicationDate
  } = req.body;

  // System rule: Enforce restriction if exam is live/ongoing/completed and student attempts already exist
  if (['live', 'ongoing', 'completed', 'published'].includes(exam.status)) {
    const hasAttempts = await ExamParticipation.exists({ examination: exam._id });
    if (hasAttempts && (questions !== undefined || startDate !== undefined || durationMinutes !== undefined)) {
      throw ApiError.badRequest(
        'Cannot alter questions, start schedule, or duration because students have already attempted this examination.'
      );
    }
  }

  if (course && course.toString() !== exam.course.toString()) {
    const courseDoc = await Course.findOne({ _id: course, isDeleted: { $ne: true } });
    if (!courseDoc) {
      throw ApiError.notFound('Assigned course does not exist');
    }
    exam.course = course;
  }

  if (title !== undefined) exam.title = title;
  if (description !== undefined) exam.description = description;
  if (instructions !== undefined) exam.instructions = instructions;
  if (targetBatches !== undefined) exam.targetBatches = targetBatches;
  if (startDate !== undefined) exam.startDate = new Date(startDate);
  if (endDate !== undefined) exam.endDate = new Date(endDate);
  if (durationMinutes !== undefined) exam.durationMinutes = durationMinutes;
  if (totalMarks !== undefined) exam.totalMarks = totalMarks;
  if (passingMarks !== undefined) exam.passingMarks = passingMarks;
  if (negativeMarks !== undefined) exam.negativeMarks = negativeMarks;
  if (maxAttempts !== undefined) exam.maxAttempts = maxAttempts;
  if (questions !== undefined) {
    exam.questions = questions;
    exam.totalQuestions = questions.length;
  }
  if (status !== undefined) exam.status = status;
  if (isPublished !== undefined) exam.isPublished = isPublished;
  if (isResultPublished !== undefined) exam.isResultPublished = isResultPublished;
  if (resultPublicationDate !== undefined) {
    exam.resultPublicationDate = resultPublicationDate ? new Date(resultPublicationDate) : undefined;
  }

  await exam.save();

  const updated = await Examination.findById(exam._id).populate('course', 'name code');
  return ApiResponse.success(res, updated, 'Examination updated successfully');
});

/**
 * @desc Update examination status
 * @route PATCH /api/v1/examinations/:id/status
 * @access Private (Admin)
 */
export const updateExaminationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const exam = await Examination.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  exam.status = status;
  await exam.save();

  return ApiResponse.success(res, exam, `Examination status updated to ${status}`);
});

/**
 * @desc Soft delete examination
 * @route DELETE /api/v1/examinations/:id
 * @access Private (Admin)
 */
export const deleteExamination = asyncHandler(async (req, res) => {
  const exam = await Examination.findOne({ _id: req.params.id, isDeleted: { $ne: true } });

  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  exam.isDeleted = true;
  exam.status = 'cancelled';
  await exam.save();

  // Remove from Course
  await Course.updateOne(
    { _id: exam.course },
    { $pull: { examinations: exam._id } }
  );

  return ApiResponse.success(res, null, 'Examination deleted successfully');
});

/**
 * ==========================================
 * QUESTION BANK MANAGEMENT ENDPOINTS (ADMIN)
 * ==========================================
 */

/**
 * @desc Add new question to examination question bank
 * @route POST /api/v1/examinations/:id/questions
 * @access Private (Admin)
 */
export const addExamQuestion = asyncHandler(async (req, res) => {
  const exam = await Examination.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  if (['live', 'ongoing', 'completed'].includes(exam.status)) {
    const hasAttempts = await ExamParticipation.exists({ examination: exam._id });
    if (hasAttempts) {
      throw ApiError.badRequest('Cannot add questions after students have already started examination attempts.');
    }
  }

  const {
    questionText,
    options,
    correctOptionIndex,
    marks,
    negativeMarks,
    subject,
    topic,
    explanation
  } = req.body;

  if (Number(correctOptionIndex) >= options.length) {
    throw ApiError.badRequest('correctOptionIndex exceeds the number of provided options');
  }

  const newQuestion = {
    questionText,
    options,
    correctOptionIndex: Number(correctOptionIndex),
    marks: marks !== undefined ? Number(marks) : 1,
    negativeMarks: negativeMarks !== undefined ? Number(negativeMarks) : (exam.negativeMarks || 0),
    subject,
    topic,
    questionType: 'mcq_single',
    isActive: true,
    explanation
  };

  exam.questions.push(newQuestion);
  exam.totalQuestions = exam.questions.length;
  await exam.save();

  const createdQuestion = exam.questions[exam.questions.length - 1];
  return ApiResponse.created(
    res,
    { question: createdQuestion, totalQuestions: exam.questions.length },
    'Question added successfully'
  );
});

/**
 * @desc Update a question in an examination
 * @route PUT /api/v1/examinations/:id/questions/:questionId
 * @access Private (Admin)
 */
export const updateExamQuestion = asyncHandler(async (req, res) => {
  const { id: examId, questionId } = req.params;
  const exam = await Examination.findOne({ _id: examId, isDeleted: { $ne: true } });
  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  const question = exam.questions.id(questionId);
  if (!question) {
    throw ApiError.notFound('Question not found in this examination');
  }

  if (['live', 'ongoing', 'completed'].includes(exam.status)) {
    const hasAttempts = await ExamParticipation.exists({ examination: exam._id });
    if (hasAttempts) {
      throw ApiError.badRequest('Cannot edit questions after students have already started examination attempts.');
    }
  }

  const {
    questionText,
    options,
    correctOptionIndex,
    marks,
    negativeMarks,
    subject,
    topic,
    explanation,
    isActive
  } = req.body;

  const currentOptions = options || question.options;
  if (correctOptionIndex !== undefined && Number(correctOptionIndex) >= currentOptions.length) {
    throw ApiError.badRequest('correctOptionIndex exceeds the number of provided options');
  }

  if (questionText !== undefined) question.questionText = questionText;
  if (options !== undefined) question.options = options;
  if (correctOptionIndex !== undefined) question.correctOptionIndex = Number(correctOptionIndex);
  if (marks !== undefined) question.marks = Number(marks);
  if (negativeMarks !== undefined) question.negativeMarks = Number(negativeMarks);
  if (subject !== undefined) question.subject = subject;
  if (topic !== undefined) question.topic = topic;
  if (explanation !== undefined) question.explanation = explanation;
  if (isActive !== undefined) question.isActive = Boolean(isActive);

  await exam.save();
  return ApiResponse.success(res, question, 'Question updated successfully');
});

/**
 * @desc Delete a question from an examination
 * @route DELETE /api/v1/examinations/:id/questions/:questionId
 * @access Private (Admin)
 */
export const deleteExamQuestion = asyncHandler(async (req, res) => {
  const { id: examId, questionId } = req.params;
  const exam = await Examination.findOne({ _id: examId, isDeleted: { $ne: true } });
  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  if (['live', 'ongoing', 'completed'].includes(exam.status)) {
    const hasAttempts = await ExamParticipation.exists({ examination: exam._id });
    if (hasAttempts) {
      throw ApiError.badRequest('Cannot delete questions after students have already started examination attempts.');
    }
  }

  const question = exam.questions.id(questionId);
  if (!question) {
    throw ApiError.notFound('Question not found in this examination');
  }

  exam.questions.pull(questionId);
  exam.totalQuestions = exam.questions.length;
  await exam.save();

  return ApiResponse.success(
    res,
    { totalQuestions: exam.questions.length },
    'Question deleted successfully from examination'
  );
});

/**
 * @desc Toggle question active/inactive status
 * @route PATCH /api/v1/examinations/:id/questions/:questionId/status
 * @access Private (Admin)
 */
export const toggleQuestionStatus = asyncHandler(async (req, res) => {
  const { id: examId, questionId } = req.params;
  const { isActive } = req.body;

  const exam = await Examination.findOne({ _id: examId, isDeleted: { $ne: true } });
  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  const question = exam.questions.id(questionId);
  if (!question) {
    throw ApiError.notFound('Question not found in this examination');
  }

  question.isActive = isActive !== undefined ? Boolean(isActive) : !question.isActive;
  await exam.save();

  return ApiResponse.success(
    res,
    { questionId: question._id, isActive: question.isActive },
    `Question marked as ${question.isActive ? 'active' : 'inactive'}`
  );
});

/**
 * ==========================================
 * STUDENT EXAMINATION WORKFLOW ENDPOINTS
 * ==========================================
 */

/**
 * @desc Get available examinations for logged-in student (with Upcoming, Live, or Completed status)
 * @route GET /api/v1/student/examinations
 * @access Private (Student)
 */
export const getStudentAvailableExams = asyncHandler(async (req, res) => {
  const student = req.student;
  const now = new Date();

  // Safely extract student course ID (whether ObjectId or populated object)
  const studentCourseId = student.course?._id ? student.course._id : student.course;

  const query = {
    course: studentCourseId,
    isDeleted: { $ne: true },
    $and: [
      { status: { $nin: ['draft', 'cancelled'] } },
      {
        $or: [
          { status: { $in: ['scheduled', 'live', 'ongoing', 'published', 'active'] } },
          { isPublished: true }
        ]
      }
    ]
  };

  const exams = await Examination.find(query)
    .populate('course', 'name code category')
    .select('-questions.correctOptionIndex -questions.explanation')
    .sort('startDate');

  // Filter exams by student batch (case-insensitive & trimmed; if targetBatches is empty, exam is for ALL batches)
  const studentBatch = (student.batch || '').trim().toLowerCase();
  const matchingExams = exams.filter((exam) => {
    if (!exam.targetBatches || exam.targetBatches.length === 0) return true;
    return exam.targetBatches.some((b) => b && b.trim().toLowerCase() === studentBatch);
  });

  // Attach student attempt information and lifecycle status
  const examIds = matchingExams.map((e) => e._id);
  const studentAttempts = await ExamParticipation.find({
    examination: { $in: examIds },
    student: student._id
  }).select('examination status attemptNumber isEvaluated');

  const studentResults = await Result.find({
    examination: { $in: examIds },
    student: student._id
  })
    .sort({ createdAt: -1 })
    .populate('participation', 'attemptNumber startTime submitTime durationUsedMinutes isAutoSubmitted');

  const formattedExams = matchingExams.map((exam) => {
    const attempts = studentAttempts.filter((a) => a.examination.toString() === exam._id.toString());
    const hasActiveAttempt = attempts.some((a) => a.status === 'in-progress');
    const completedAttemptsCount = attempts.filter((a) => a.status === 'submitted' || a.status === 'timed-out').length;
    const maxAttempts = exam.maxAttempts || 1;
    const hasAttemptsRemaining = completedAttemptsCount < maxAttempts;

    let lifecycleStatus = 'Upcoming';
    if (now < new Date(exam.startDate)) {
      lifecycleStatus = 'Upcoming';
    } else if (!hasAttemptsRemaining && !hasActiveAttempt) {
      lifecycleStatus = 'Completed';
    } else if (now >= new Date(exam.startDate) && (now <= new Date(exam.endDate) || hasAttemptsRemaining)) {
      lifecycleStatus = 'Live';
    } else {
      lifecycleStatus = 'Completed';
    }

    const canAttempt =
      (hasActiveAttempt || hasAttemptsRemaining) &&
      now >= new Date(exam.startDate);

    // Get the latest result for this exam
    const examResults = studentResults.filter((r) => r.examination.toString() === exam._id.toString());
    const latestResult = examResults.length > 0 ? examResults[0] : null;

    return {
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      course: exam.course,
      targetBatches: exam.targetBatches,
      startDate: exam.startDate,
      endDate: exam.endDate,
      durationMinutes: exam.durationMinutes,
      totalQuestions: exam.questions ? exam.questions.length : exam.totalQuestions,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      negativeMarks: exam.negativeMarks,
      maxAttempts: exam.maxAttempts,
      lifecycleStatus,
      canAttempt,
      hasActiveAttempt,
      completedAttemptsCount,
      latestResult
    };
  });

  // Display Sequence: Live exams first -> Upcoming exams next -> Completed exams last
  const statusPriority = { Live: 1, Upcoming: 2, Completed: 3 };
  formattedExams.sort((a, b) => {
    if (statusPriority[a.lifecycleStatus] !== statusPriority[b.lifecycleStatus]) {
      return statusPriority[a.lifecycleStatus] - statusPriority[b.lifecycleStatus];
    }
    return new Date(a.startDate) - new Date(b.startDate);
  });

  return ApiResponse.success(res, formattedExams, 'Available examinations retrieved successfully');
});

/**
 * @desc Get examination instructions for student before starting
 * @route GET /api/v1/student/examinations/:id/instructions
 * @access Private (Student)
 */
export const getStudentExamInstructions = asyncHandler(async (req, res) => {
  const student = req.student;
  const { exam, activeAttempt, totalAttempts } = await examinationService.verifyStudentEligibility(
    req.params.id,
    student
  );

  return ApiResponse.success(
    res,
    {
      examinationId: exam._id,
      title: exam.title,
      course: exam.course,
      instructions:
        exam.instructions ||
        '1. Answer all questions within the allowed time limit.\n2. You can navigate between questions and mark questions for review.\n3. The exam will automatically submit when the timer expires.\n4. Negative marking will be applied if configured.',
      startDate: exam.startDate,
      endDate: exam.endDate,
      durationMinutes: exam.durationMinutes,
      totalQuestions: exam.questions ? exam.questions.length : exam.totalQuestions,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      negativeMarks: exam.negativeMarks,
      maxAttempts: exam.maxAttempts,
      remainingAttempts: Math.max(0, exam.maxAttempts - totalAttempts),
      hasActiveAttempt: Boolean(activeAttempt)
    },
    'Examination instructions retrieved successfully'
  );
});

/**
 * @desc Get single exam details for student (strips correctOptionIndex and explanation)
 * @route GET /api/v1/student/examinations/:id
 * @access Private (Student)
 */
export const getStudentExamById = asyncHandler(async (req, res) => {
  const student = req.student;
  const { exam } = await examinationService.verifyStudentEligibility(req.params.id, student);

  // Strip correct answer indices & explanations to prevent cheating
  const examObj = exam.toObject();
  if (examObj.questions) {
    examObj.questions = examObj.questions
      .filter((q) => q.isActive !== false)
      .map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        marks: q.marks,
        negativeMarks: q.negativeMarks || examObj.negativeMarks || 0,
        subject: q.subject,
        topic: q.topic
      }));
  }

  return ApiResponse.success(res, examObj, 'Examination details retrieved');
});

/**
 * @desc Start examination attempt & return questions palette without correct answers
 * @route POST /api/v1/student/examinations/:id/start
 * @access Private (Student)
 */
export const startExamAttempt = asyncHandler(async (req, res) => {
  const student = req.student;
  const { exam, activeAttempt, totalAttempts } = await examinationService.verifyStudentEligibility(
    req.params.id,
    student
  );

  // Safe questions list without answers or explanations
  const safeQuestions = (exam.questions || [])
    .filter((q) => q.isActive !== false)
    .map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      marks: q.marks,
      negativeMarks: q.negativeMarks || exam.negativeMarks || 0,
      subject: q.subject,
      topic: q.topic
    }));

  // If student already has an active attempt in progress, resume it
  if (activeAttempt) {
    if (!activeAttempt.totalQuestions) {
      activeAttempt.totalQuestions = safeQuestions.length;
      const attemptedCount = (activeAttempt.answers || []).filter((a) => a.isAttempted).length;
      activeAttempt.totalAttempted = attemptedCount;
      activeAttempt.totalUnattempted = Math.max(0, safeQuestions.length - attemptedCount);
      await activeAttempt.save();
    }

    const elapsedSeconds = Math.floor((Date.now() - new Date(activeAttempt.startTime).getTime()) / 1000);
    const totalAllowedSeconds = (exam.durationMinutes || 60) * 60;
    const timeRemainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

    return ApiResponse.success(
      res,
      {
        participation: activeAttempt,
        questions: safeQuestions,
        answers: activeAttempt.answers || [],
        durationMinutes: exam.durationMinutes,
        timeRemainingSeconds,
        message: 'Resuming active examination attempt'
      },
      'Active attempt retrieved'
    );
  }

  const attemptNumber = totalAttempts + 1;

  // Initialize empty answers for each question
  const initialAnswers = safeQuestions.map((q) => ({
    questionId: q._id,
    selectedOptionIndex: null,
    isAttempted: false,
    isMarkedForReview: false
  }));

  const participation = await ExamParticipation.create({
    examination: exam._id,
    student: student._id,
    course: exam.course._id || exam.course,
    batch: student.batch,
    attemptNumber,
    startTime: new Date(),
    status: 'in-progress',
    totalQuestions: safeQuestions.length,
    totalAttempted: 0,
    totalUnattempted: safeQuestions.length,
    answers: initialAnswers
  });

  const totalAllowedSeconds = (exam.durationMinutes || 60) * 60;

  return ApiResponse.created(
    res,
    {
      participation,
      questions: safeQuestions,
      answers: participation.answers,
      durationMinutes: exam.durationMinutes,
      timeRemainingSeconds: totalAllowedSeconds
    },
    'Examination attempt started'
  );
});

/**
 * @desc Auto-save student's current question answer or mark for review in real time
 * @route POST /api/v1/student/examinations/:id/save-answer
 * @access Private (Student)
 */
export const saveStudentAnswer = asyncHandler(async (req, res) => {
  const student = req.student;
  const { id: examinationId } = req.params;
  const { questionId, selectedOptionIndex, isMarkedForReview } = req.body;

  const participation = await ExamParticipation.findOne({
    examination: examinationId,
    student: student._id,
    status: 'in-progress'
  }).populate('examination', 'durationMinutes totalMarks passingMarks negativeMarks questions');

  if (!participation) {
    throw ApiError.badRequest('No active in-progress attempt found for this examination.');
  }

  // Enforce remaining duration limit
  const elapsedSeconds = Math.floor((Date.now() - new Date(participation.startTime).getTime()) / 1000);
  const totalAllowedSeconds = (participation.examination?.durationMinutes || 60) * 60;
  const timeRemainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

  if (timeRemainingSeconds <= 0) {
    const exam = participation.examination;
    const { breakdown } = await examinationService.evaluateAndSubmit(exam, participation, [], true);
    return ApiResponse.success(
      res,
      {
        autoSubmitted: true,
        breakdown,
        message: 'Time expired! Your examination has been automatically submitted.'
      },
      'Time expired. Examination auto-submitted.'
    );
  }

  await examinationService.saveQuestionAnswer(participation, {
    questionId,
    selectedOptionIndex,
    isMarkedForReview
  });

  return ApiResponse.success(
    res,
    {
      savedQuestionId: questionId,
      timeRemainingSeconds,
      selectedOptionIndex,
      isMarkedForReview: Boolean(isMarkedForReview)
    },
    'Answer auto-saved successfully'
  );
});

/**
 * @desc Submit examination answers (manual or auto-submit upon timer completion)
 * @route POST /api/v1/student/examinations/:id/submit
 * @access Private (Student)
 */
export const submitExamAttempt = asyncHandler(async (req, res) => {
  const student = req.student;
  const { id: examinationId } = req.params;
  const { answers = [], isAutoSubmitted = false } = req.body;

  const exam = await Examination.findOne({
    _id: examinationId,
    isDeleted: { $ne: true }
  });

  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  // Find active attempt for student
  const participation = await ExamParticipation.findOne({
    examination: exam._id,
    student: student._id,
    status: 'in-progress'
  });

  if (!participation) {
    throw ApiError.badRequest('No active in-progress attempt found for this examination. It may have already been submitted.');
  }

  const { participation: evaluatedParticipation, breakdown } = await examinationService.evaluateAndSubmit(
    exam,
    participation,
    answers,
    Boolean(isAutoSubmitted)
  );

  return ApiResponse.success(
    res,
    {
      participationId: evaluatedParticipation._id,
      examinationId: exam._id,
      examinationTitle: exam.title,
      status: evaluatedParticipation.status,
      submitTime: evaluatedParticipation.submitTime,
      isAutoSubmitted: evaluatedParticipation.isAutoSubmitted,
      durationUsedMinutes: evaluatedParticipation.durationUsedMinutes,
      breakdown: {
        totalQuestions: breakdown.totalQuestions,
        totalAttempted: breakdown.totalAttempted,
        totalCorrect: breakdown.totalCorrect,
        totalWrong: breakdown.totalWrong,
        totalUnattempted: breakdown.totalUnattempted,
        totalMarks: breakdown.totalMarks,
        positiveMarks: breakdown.positiveMarks,
        negativeMarksDeducted: breakdown.negativeMarksDeducted,
        obtainedMarks: breakdown.obtainedMarks,
        percentage: breakdown.percentage,
        isPassed: breakdown.isPassed,
        grade: breakdown.grade
      }
    },
    isAutoSubmitted
      ? 'Examination auto-submitted upon timer completion and evaluated successfully'
      : 'Examination submitted and evaluated successfully'
  );
});

/**
 * @desc Get student's current attempt status and remaining time
 * @route GET /api/v1/student/examinations/:id/attempt
 * @access Private (Student)
 */
export const getStudentCurrentAttempt = asyncHandler(async (req, res) => {
  const student = req.student;
  const { id: examinationId } = req.params;

  const participation = await ExamParticipation.findOne({
    examination: examinationId,
    student: student._id
  })
    .sort('-createdAt')
    .populate('examination', 'title durationMinutes totalMarks passingMarks negativeMarks');

  if (!participation) {
    return ApiResponse.success(res, null, 'No examination attempt found for this examination');
  }

  let timeRemainingSeconds = 0;
  if (participation.status === 'in-progress' && participation.examination) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(participation.startTime).getTime()) / 1000);
    const totalAllowedSeconds = (participation.examination.durationMinutes || 60) * 60;
    timeRemainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);
  }

  return ApiResponse.success(
    res,
    {
      participation,
      timeRemainingSeconds
    },
    'Current attempt retrieved'
  );
});

/**
 * @desc Get student's examination result
 * @route GET /api/v1/student/examinations/:id/result
 * @access Private (Student)
 */
export const getStudentExamResult = asyncHandler(async (req, res) => {
  const student = req.student;
  const { id: examinationId } = req.params;

  const exam = await Examination.findOne({ _id: examinationId, isDeleted: { $ne: true } });
  if (!exam) {
    throw ApiError.notFound('Examination not found');
  }

  const result = await Result.findOne({
    examination: examinationId,
    student: student._id
  })
    .sort({ createdAt: -1 })
    .populate('examination', 'title totalMarks passingMarks isResultPublished resultPublicationDate')
    .populate('participation', 'startTime submitTime durationUsedMinutes isAutoSubmitted');

  if (!result) {
    throw ApiError.notFound('No evaluation result found for this examination attempt.');
  }

  // Verify publication status
  const now = new Date();
  const isPublishedByDate = exam.resultPublicationDate && now >= new Date(exam.resultPublicationDate);
  const isPublished = exam.isResultPublished || isPublishedByDate || result.status === 'published';

  if (!isPublished) {
    return ApiResponse.success(
      res,
      {
        examinationTitle: exam.title,
        status: 'Results are pending publication by administration.',
        resultPublicationDate: exam.resultPublicationDate
      },
      'Examination submitted. Results have not been published yet.'
    );
  }

  return ApiResponse.success(res, result, 'Examination result retrieved successfully');
});
