// /api/status.js
// Returns recent submissions (for debugging/checking what's been submitted)

global.submittedUrls = global.submittedUrls || [];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json({
    count: global.submittedUrls.length,
    submissions: global.submittedUrls.slice(0, 20),
  });
};
