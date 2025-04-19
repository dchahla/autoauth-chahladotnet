module.exports = {
  apps: [
    {
      name: 'WSS Vanilla Backend',
      script: 'app.js', // Update this with the path to your main application file
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 3,  // Set the maximum number of automatic restarts
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        ACAO:'https://chahla.net',
        FIREBASE_SECRET:'SVzVFcTwbhXMS2PO898xHoW0LrWu5fcZhmp5KggL',
        FIREBASEURL:'chahlanet',
        FIREBASESERVICEACCOUNTJSON:'chahlanet-firebase-adminsdk-dc7h4-2dea812ff1.json'
      },
      env_dev: {
        NODE_ENV: 'development',
      },
    },
  ],
};

