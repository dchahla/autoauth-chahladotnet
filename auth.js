var FirebaseTokenGenerator = require('firebase-token-generator')
var tokenGenerator = new FirebaseTokenGenerator(process.env.FIREBASE_SECRET)
var admin = require('firebase-admin')

const auth = {
  tenantJwtCheck: {},
  createToken: function (body) {
    return new Promise((resolve, reject) => {
      // const tokenObj = {}
      // tokenObj.expires = moment().add(12, 'hours').unix()
      // tokenObj.token = tokenGenerator.createToken(body, {expires: tokenObj.expires})
      admin
        .auth()
        .createCustomToken(body.uid, body)
        .then(function (customToken) {
          const tokenObj = {}
          tokenObj.uid = body.uid
          tokenObj.token = customToken
          // console.log(customToken)
          // tokenObj.expires = moment().add(12, 'hours').unix()
          // Send token back to client
          resolve(tokenObj)
        })
        .catch(function (error) {
          reject(error)
          console.log('Error creating custom token:', error)
        })
    })
  },
  createOldToken: function (body) {
    return new Promise((resolve, reject) => {
      var FirebaseTokenGenerator = require('firebase-token-generator')

      const now = new Date().getTime()
      const futureTimestamp = Math.floor((now + 8 * 1000) / 1000)
      console.log(
        futureTimestamp * 1000,
        '-',
        now,
        '=',
        futureTimestamp * 1000 - now
      )
      const tokenObj = {}
      tokenObj.expires = futureTimestamp
      tokenObj.token = tokenGenerator.createToken(body, {
        expires: tokenObj.expires
      })
      resolve(tokenObj)
    })
  }
}
// auth.createToken({"uid":"danny4realfiles"})
module.exports = auth
