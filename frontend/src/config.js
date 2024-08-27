const config = {
  apiBaseUrl: process.env.NODE_ENV === 'production' 
    ? 'http://134.209.64.243/api'
    : 'http://localhost:5000/api'
};

export default config;
