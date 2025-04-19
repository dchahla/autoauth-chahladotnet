// const FirebaseTokenGenerator = require('firebase-token-generator')
// const Firebase = require('firebase')
var ref
var admin = require('firebase-admin')
var serviceAccount = require('./ignore/' +
  process.env.FIREBASESERVICEACCOUNTJSON)

// var firebaseClient = {
//   connect: function () {
//     return new Promise((resolve, reject) => {
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASEURL}.firebaseio.com`
})
// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = admin.database()
ref = db.ref('/')

//     })
//   }

// }
module.exports = ref
// module.exports = firebaseClient
