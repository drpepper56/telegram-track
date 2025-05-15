module.exports = {
    files: 'dist/**/*.js',
    from: 
      /__SERVER_API_KEY__/g,
    to: 
      process.env.SERVER_API_KEY
  };