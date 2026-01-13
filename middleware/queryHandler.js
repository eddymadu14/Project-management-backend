
export const queryHandler = (model) => async (req, res, next) => {
  try {
    const queryObj = { ...req.query };

    // Fields to exclude from filtering
    const excludeFields = ["page", "sort", "limit", "fields", "search"];
    excludeFields.forEach((el) => delete queryObj[el]);

    // Basic Filtering (e.g. ?role=admin&active=true)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt|regex)\b/g,
      (match) => `$${match}`
    );

    let query = model.find(JSON.parse(queryStr));

    // Search Filtering (e.g. ?search=john)
    if (req.query.search) {
      query = query.find({
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      });
    }

    // Sorting (e.g. ?sort=-createdAt,name)
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    // Field Limiting (e.g. ?fields=name,email)
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    //  Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute Query
    const results = await query;
    const total = await model.countDocuments(JSON.parse(queryStr));

    res.filteredResults = {
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: results.length,
      data: results,
    };

    next();
  } catch (error) {
    next(error);
  }
};