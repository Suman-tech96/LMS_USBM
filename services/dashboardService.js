import { Student } from '../models/Student.js';
import { Course } from '../models/Course.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { Examination } from '../models/Examination.js';
import { ExamParticipation } from '../models/ExamParticipation.js';
import { Result } from '../models/Result.js';

class DashboardService {
  /**
   * Get comprehensive system overview metrics
   */
  async getOverview() {
    const now = new Date();

    const [
      studentStats,
      totalStudyMaterials,
      courseStats,
      examStats,
      upcomingExams,
      completedExams,
      participationStats,
      resultStats
    ] = await Promise.all([
      // Student counts
      Student.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $ne: ['$status', 'active'] }, 1, 0] } }
          }
        }
      ]),

      // Study materials count
      StudyMaterial.countDocuments({ isDeleted: { $ne: true } }),

      // Course counts
      Course.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } }
          }
        }
      ]),

      // Total exams by status
      Examination.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Upcoming exams (startDate > now)
      Examination.countDocuments({
        isDeleted: { $ne: true },
        startDate: { $gt: now },
        status: { $in: ['scheduled', 'draft'] }
      }),

      // Completed exams (endDate < now or status completed)
      Examination.countDocuments({
        isDeleted: { $ne: true },
        $or: [{ endDate: { $lt: now } }, { status: 'completed' }]
      }),

      // Exam participation count
      ExamParticipation.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Result publication counts
      Result.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgScore: { $avg: '$percentage' },
            passed: { $sum: { $cond: ['$isPassed', 1, 0] } },
            failed: { $sum: { $cond: ['$isPassed', 0, 1] } }
          }
        }
      ])
    ]);

    const students = studentStats[0] || { total: 0, active: 0, inactive: 0 };
    const courses = courseStats[0] || { total: 0, active: 0, inactive: 0 };

    let publishedResults = 0;
    let unpublishedResults = 0;
    resultStats.forEach((r) => {
      if (r._id === 'published') publishedResults = r.count;
      if (r._id === 'unpublished') unpublishedResults = r.count;
    });

    const examStatusMap = {};
    let totalExaminations = 0;
    examStats.forEach((e) => {
      examStatusMap[e._id] = e.count;
      totalExaminations += e.count;
    });

    let totalParticipations = 0;
    const participationMap = {};
    participationStats.forEach((p) => {
      participationMap[p._id] = p.count;
      totalParticipations += p.count;
    });

    return {
      students: {
        total: students.total,
        active: students.active,
        inactive: students.inactive
      },
      studyMaterials: {
        total: totalStudyMaterials
      },
      courses: {
        total: courses.total,
        active: courses.active,
        inactive: courses.inactive
      },
      examinations: {
        total: totalExaminations,
        upcoming: upcomingExams,
        completed: completedExams,
        byStatus: examStatusMap
      },
      participations: {
        total: totalParticipations,
        byStatus: participationMap
      },
      results: {
        total: publishedResults + unpublishedResults,
        published: publishedResults,
        unpublished: unpublishedResults
      }
    };
  }

  /**
   * Study materials dashboard stats
   */
  async getStudyMaterialsStats() {
    const stats = await StudyMaterial.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { fileType: '$fileType', status: '$status' },
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    const totalMaterials = await StudyMaterial.countDocuments({ isDeleted: { $ne: true } });

    return {
      total: totalMaterials,
      breakdown: stats
    };
  }

  /**
   * Courses dashboard stats
   */
  async getCoursesStats() {
    const [coursesSummary, studentsPerCourse] = await Promise.all([
      Course.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Student.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$course',
            studentCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'courseDetails'
          }
        },
        { $unwind: '$courseDetails' },
        {
          $project: {
            courseId: '$_id',
            courseName: '$courseDetails.name',
            courseCode: '$courseDetails.code',
            studentCount: 1
          }
        }
      ])
    ]);

    return {
      summary: coursesSummary,
      studentsPerCourse
    };
  }

  /**
   * Examination status breakdown
   */
  async getExaminationsStatus() {
    const breakdown = await Examination.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return { breakdown };
  }

  /**
   * Examination detailed statistics
   */
  async getExaminationStatistics() {
    const [participationSummary, topExams] = await Promise.all([
      ExamParticipation.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgScore: { $avg: '$totalScore' }
          }
        }
      ]),
      Result.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: '$examination',
            totalAttempts: { $sum: 1 },
            avgPercentage: { $avg: '$percentage' },
            passedCount: { $sum: { $cond: ['$isPassed', 1, 0] } }
          }
        },
        {
          $lookup: {
            from: 'examinations',
            localField: '_id',
            foreignField: '_id',
            as: 'exam'
          }
        },
        { $unwind: '$exam' },
        {
          $project: {
            examinationId: '$_id',
            title: '$exam.title',
            totalAttempts: 1,
            avgPercentage: { $round: ['$avgPercentage', 2] },
            passRate: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$passedCount', { $max: ['$totalAttempts', 1] }] },
                    100
                  ]
                },
                2
              ]
            }
          }
        },
        { $limit: 10 }
      ])
    ]);

    return {
      participationSummary,
      topExams
    };
  }

  /**
   * Results status breakdown
   */
  async getResultsStatus() {
    const stats = await Result.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          passed: { $sum: { $cond: ['$isPassed', 1, 0] } },
          failed: { $sum: { $cond: ['$isPassed', 0, 1] } },
          avgScore: { $avg: '$obtainedMarks' }
        }
      }
    ]);

    return { resultsStatus: stats };
  }
}

export const dashboardService = new DashboardService();
