const jwt = require('jsonwebtoken')
const secret = process.env.FIREBASE_SECRET

var checker = {
  verifyToken: function (token) {
    if (!token) {
      return { error: 'Unauthorized - No token provided' }
    }
    // invalid token - synchronous
    try {
      var decoded = jwt.verify(token, secret)
      return decoded
    } catch (err) {
      console.error('Error verifying token:', err)
      return false
    }

    // }
  }
}

module.exports = checker
