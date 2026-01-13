//to use
//GET /api/stats/top-users?limit=3

const topUsersPipeline = (req) => {
  const limit = parseInt(req.query.limit) || 5;
  return [
    { $match: { isActive: true } },
    { $sort: { purchaseCount: -1 } },
    { $limit: limit },
    { $project: { name: 1, email: 1, purchaseCount: 1 } },
  ];
};


//GET /api/stats/user-stats?year=2025
const userStatsPipeline = (req) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  return [
    { 
      $match: { 
        createdAt: { 
          $gte: new Date(`${year}-01-01`), 
          $lte: new Date(`${year}-12-31`) 
        } 
      } 
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        totalRegistrations: { $sum: 1 },
      },
    },
    { $sort: { "_id": 1 } },
    {
      $project: {
        month: "$_id",
        totalRegistrations: 1,
        _id: 0
      },
    },
  ];
};



const analyticsPipeline = (req) => {
  const type = req.query.type;

  switch (type) {
    case "monthly-users":
      return [
        { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } },
      ];

    case "top-buyers":
      return [
        { $sort: { purchaseCount: -1 } },
        { $limit: 5 },
        { $project: { name: 1, email: 1, purchaseCount: 1 } },
      ];

    default:
      throw new Error("Invalid analytics type");
  }
};
