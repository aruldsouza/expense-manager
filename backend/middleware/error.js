const errorHandler = (err, req, res, next) => {
  console.error(`[Error Log] ${req.method} ${req.url}:`, err.stack || err.message);

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  if (err.code === 11000) {
    return res.status(400).json({ error: 'Duplicate field value entered' });
  }

  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongooseError' || err.message?.includes('buffering timed out')) {
    return res.status(503).json({
      error: 'Database connection unavailable. Please ensure MONGODB_URI environment variable is configured in Render service settings.'
    });
  }

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error'
  });

};

module.exports = errorHandler;
