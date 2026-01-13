
export const aggregationHandler = (model, pipelineBuilder) => async (req, res, next) => {
  try {
    // Build aggregation pipeline dynamically
    const pipeline = pipelineBuilder(req);

    const results = await model.aggregate(pipeline);

    res.aggregatedResults = {
      success: true,
      count: results.length,
      data: results,
    };

    next();
  } catch (error) {
    next(error);
  }
};
