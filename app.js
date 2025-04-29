const WebSocket = require('ws')
const fs = require('fs')
const tls = require('tls')
const { ref } = require('./fbauth')
const redisConnect = require('./redisConnect')
const redis = redisConnect()
const auth = require('./auth')
const authchecker = require('./checker')
const userHelper = require('./userHelper')
const isPorn = require('is-porn')

// Server-side code (Node.js)
const server = new WebSocket.Server({
  port: 3003,
  // cert: fs.readFileSync('/etc/letsencrypt/live/chahla.net/fullchain.pem'),
  // key: fs.readFileSync('/etc/letsencrypt/live/chahla.net/privkey.pem')
})

const MAX_CONNECTIONS = 1000
let connectedClients = 0
var s
server.on('connection', socket => {
// console.log(socket)
  if (connectedClients <= MAX_CONNECTIONS) {
    // Allow the connection
    connectedClients++

    socket.on('close', () => {
      connectedClients--
    })

    // Handle other logic for the connection...
  } else {
    // Reject the connection or implement a queuing mechanism
    socket.close()
    return
  }
  // setInterval(() => {
  //   socket.send(JSON.stringify({ type: 'new_count' }))
  // }, 15000)

  setTimeout(() => {
    s = socket
  }, 1000)
  socket.on('message', async message => {
    const data = JSON.parse(message)
    if (data.type === 'authentication') {
  // console.log(data.data)
      // Validate the unique identifier (you can customize this logic)
      const isValid = await validateIdentifier(data.data)
      const now = new Date().getTime().toString()
      await redis.set(`auth:${isValid}`, now)
      await redis.expire(`auth:${isValid}`, 60)

      // console.log(isValid)
      if (isValid) {
        socket.send(JSON.stringify({ type: 'authenticated', token: isValid }))
      } else {
        // Handle failed authentication
        socket.send(JSON.stringify({ type: 'authentication_failed' }))
      }
    } else {
      // console.log(data)
      redis.get(`auth:${data.token}`, function (err, val) {
        const now = new Date().getTime()
        if (val && Number(val) && now - Number(val)) {
          // console.log(now - Number(val))
          if (now - Number(val) < 2000000) {
            // allow add
            socket.send(JSON.stringify({ s: 'added' }))
          }
        }
      })
      // Handle other types of messages
    }
  })
})

async function validateIdentifier (identifier) {
  // Implement your logic to validate the unique identifier
  // console.log(deobfuscateString(identifier))
  const { key, decryptedString, timeChecks } = deobfuscateString(identifier)
  if (decryptedString && key && timeChecks) {
    try {
      // console.log(key, identifier, timeChecks)
      // Attempt to parse the JSON string
      const parsedData = JSON.parse(decryptedString)
      // Check if the parsed data is null
      if (parsedData === null) {
        throw new Error('Parsed data is null')
      }
      if (
        parsedData.timezoneOffset &&
        parsedData.screenSize &&
        parsedData.screenSize.width &&
        parsedData.screenSize.height
      ) {
        function removeSpacesAndPunctuation (str) {
          // Use regular expression to remove spaces and punctuation
          return str.replace(/[^\w\s]/gi, '')
        }

        function createShortString (pp) {
          // Extract values from the object
          const userAgent = pp.userAgent || ''
          const screenSize = `${pp.screenSize?.width || 0}-${
            pp.screenSize?.height || 0
          }`
          const isTouchScreen = pp.isTouchScreen || false
          const timezoneOffset = pp.timezoneOffset || 0

          // Remove spaces and punctuation from values
          const cleanedUserAgent = removeSpacesAndPunctuation(userAgent)
          const cleanedScreenSize = removeSpacesAndPunctuation(
            screenSize.toString()
          )

          // Create the final string
          const shortStringNoSize = `${cleanedUserAgent}-${isTouchScreen}-${timezoneOffset}`

          const shortString = `${cleanedUserAgent}-${cleanedScreenSize}-${isTouchScreen}-${timezoneOffset}`
          // console.log(
          //   shortStringNoSize.replaceAll(' ', ''),
          //   shortString.replaceAll(' ', '')
          // )
          return {
            shortString: shortString.replaceAll(' ', ''),
            shortStringNoSize: shortStringNoSize.replaceAll(' ', '')
          }
        }

        const { shortString, shortStringNoSize } = createShortString(parsedData)
        // console.log(removeSpacesAndPunctuation(shortString))

        const uid = `${key}-${timeChecks.timeDifferenceBetweenEach}-${timeChecks.timeDifferenceBetweenFirstAndReceive}`
        ref
          .child('metrics')
          .child(shortString)
          .once('value', function (snap) {
            // console.log(snap.val())
            if (!snap.val()) {
              ref
                .child('metrics')
                .child(shortString)
                .set({ uid, screen: parsedData, t: timeChecks })
            } else {
              ref
                .child('metrics')
                .child(shortString)
                .child('numberOfVisits')
                .transaction(currentCount => {
                  // If the node does not exist, create it with an initial count of 1
                  if (currentCount === null) {
                    return 1
                  }

                  // Increment the existing count by 1
                  return currentCount + 1
                })
                .then(transactionResult => {
                  if (transactionResult.committed) {
                    return
                    // console.log('Transaction successful.', shortString)
                  } else {
                    console.log('Transaction aborted.')
                    return
                  }
                })
                .catch(error => {
                  console.error('Transaction failed:', error)
                  return
                })
            }
          })
        // ref.child('u').child(uid).push(parsedData)

        //do something with it
        parsedData.uid = uid
        const mutationtoken = await auth.createToken(parsedData)

        const token = await auth.createOldToken(parsedData)
        // console.log(token)
        return { uid, token, mutationtoken }
      } else {
        return false
      }
    } catch (error) {
      // Handle the error
      console.error('Error parsing JSON:', decryptedString, error.message)
      return false
      // You can choose to return a default value or throw the error again
      // For example, return null or throw error;
    }
  } else {
    return false
  }

  // Return true if valid, false otherwise
}

function deobfuscateString (obfuscatedNumber) {
  // Convert the comma-separated string to ASCII values
  const asciiValues = obfuscatedNumber.toString().split(',')
  // Convert ASCII values to characters
  const result = String.fromCharCode.apply(null, asciiValues)

  // Split the decoded string into key and obfuscated content
  const [key, obfuscatedString] = result.split('|')
  // console.log(key)
  // Example usage with the given double timestamp
  const timeChecks = splitAndCalculate(key)
  if (
    timeChecks.timeDifferenceBetweenEach < 10 &&
    // r.timeDifferenceBetweenFirstAndReceive < 1000 &&
    timeChecks.timeDifferenceBetweenSecondAndReceive < 5000
  ) {
    // Deobfuscate the obfuscated string using the key
    let decryptedString = ''

    for (let i = 0; i < obfuscatedString.length; i++) {
      const obfuscatedChar = String.fromCharCode(
        ~obfuscatedString.charCodeAt(i)
      ) // Use Tilde operator
      const keyChar = key.charAt(i % key.length)

      // XOR each character with the corresponding key character
      const originalChar = String.fromCharCode(
        obfuscatedChar.charCodeAt(0) ^ keyChar.charCodeAt(0)
      )

      decryptedString += originalChar
    }

    return { key, decryptedString, timeChecks }
  } else {
    console.log('timeChecks not met')

    console.log(timeChecks)
    return {}
  }
}
function splitAndCalculate (timestamp) {
  // Convert the timestamp to a string
  const timestampStr = timestamp.toString()

  // Split the timestamp into two parts
  const firstPaintTimestamp = timestampStr.slice(0, timestampStr.length / 2)
  const loadedTimestamp = timestampStr.slice(timestampStr.length / 2)

  // Parse the split timestamps into numbers
  const firstTimestampNum = parseInt(firstPaintTimestamp, 10)
  const secondTimestampNum = parseInt(loadedTimestamp, 10)

  // Compute the difference between the split timestamps
  const timeDifferenceBetweenEach = secondTimestampNum - firstTimestampNum

  // Get the current time
  const currentTime = new Date().getTime()

  // Calculate the difference between the current time and each timestamp
  const timeDifferenceBetweenFirstAndReceive = currentTime - firstTimestampNum
  const timeDifferenceBetweenSecondAndReceive = currentTime - secondTimestampNum
  // {
  //   firstTimestamp: 1705611137784,
  //   secondTimestamp: 1705611137865,
  //   timeDifference: 81,
  //   timeDifferenceToFirst: 88,
  //   timeDifferenceToSecond: 7
  // }
  // return {
  //   firstTimestamp: firstTimestampNum,
  //   secondTimestamp: secondTimestampNum,
  //   timeDifference,
  //   timeDifferenceToFirst,
  //   timeDifferenceToSecond
  // }
  return {
    firstPaintTimestamp: firstTimestampNum,
    loadedTimestamp: secondTimestampNum,
    timeDifferenceBetweenEach,
    timeDifferenceBetweenFirstAndReceive,
    timeDifferenceBetweenSecondAndReceive
  }
}
const http = require('http')
const endpoints = ['/user/api/auto', '/user/api/create']
/**
 * Attach the minimum headers the browser looks for during a CORS check.
 * @param {http.ServerResponse} res – the Node response object
 * @param {string} origin – which origin to allow (defaults to "*")
 */
function addCors(res, origin = '*') {
  res.setHeader('Access-Control-Allow-Origin', origin);          // who may access
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  // optional: let the browser cache the pre‑flight for a day
  res.setHeader('Access-Control-Max-Age', '86400');
}

const exserver = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS' && endpoints.includes(req.url)) {
    // Respond to the preflight request
    console.log(req.url)
    res.writeHead(200, {
      'Access-Control-Allow-Origin': process.env.ACAO, // Adjust as needed
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': ['Content-Type', 'Authorization'],
      'Content-Length': '0'
    })
    res.end()
  } else if (req.method === 'POST' && req.url === '/user/api/auto') {
    let body = ''

    req.on('data', chunk => {
      body += chunk
    })

    req.on('end', async () => {
      // The entire request body is now in the 'body' variable
      // console.log('Request body:', body)
      // You can handle the body data as needed
      // For example, you can parse it as JSON if it's in JSON format
      try {
        const data = JSON.parse(body)
        // console.log('Parsed JSON:', data)

        if (data.type === 'authentication') {
          // Validate the unique identifier (you can customize this logic)
          const { uid, token, mutationtoken } = await validateIdentifier(
            data.data
          )
          if (token && uid) {
            const now = new Date().getTime().toString()
            await redis.set(`auth:${uid}`, now)
            await redis.expire(`auth:${uid}`, 1800)
            // console.log(token)
            addCors(res);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            token.core = 'chahlanet'
            token.resource = 'firebaseio.com'
            // Convert the response data to JSON and send it
            res.end(JSON.stringify(token))
          } else {
            // Handle failed authentication
            addCors(res);
            res.writeHead(200, { 'Content-Type': 'application/json' });

            // Convert the response data to JSON and send it
            res.end(JSON.stringify({ type: 'authentication_failed' }))
          }
        }
      } catch (error) {
        console.error('Error parsing JSON:', error.message)
      }

      // res.writeHead(200, { 'Content-Type': 'text/plain' })
      // res.end('Received POST request')
    })
  } else if (req.method === 'POST' && req.url === '/user/api/create') {
    let body = ''
    const verified = await authchecker.verifyToken(req.headers.authorization)
    if (verified) {
      // console.log(verified)
      req.on('data', chunk => {
        body += chunk
      })

      req.on('end', async () => {
        try {
          const rq = JSON.parse(body)
          // console.log('Parsed JSON:', rq)
          if (rq.type === 'mutation') {
            const checkPornStatus = async urls => {
              const promises = urls.map(({ host }) => {
                return new Promise(resolve => {
                  isPorn(host.substring(0, 255), (error, status) => {
                    console.log(error, host + ' :', status)
                    resolve(status)
                  })
                })
              })

              const results = await Promise.all(promises)

              // Check if at least one status is true
              const hasPorn = results.some(status => status === true)

              return hasPorn
            }
            if (rq && rq.data && rq.data.allUrls && rq.data.allUrls.length) {
              const buf = rq.data.allUrls
              checkPornStatus(buf).then(async isitporn => {
                console.log('Result:', isitporn)
                if (!isitporn) {
                  const increInfo = await userHelper.increment(rq.data)
                  if (increInfo.count >= 7) {
                    console.log(
                      'still at 7 postLength, but new count',
                      increInfo.count
                    )
                    // await s.send(JSON.stringify({ type: 'new_count' }))

                    // console.log(increInfo.lastTen)
                  }
                  if (increInfo.count < 7) {
                    console.log(
                      'new postLength pub!',
                      increInfo.previousCount,
                      '->',
                      increInfo.count
                    )

                    // await s.send(JSON.stringify({ type: 'new_add' }))

                    // socket.send(JSON.stringify({ type: 'new_add' }))
                  }
                  res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': process.env.ACAO // Adjust as needed
                  })
                  res.end(
                    JSON.stringify({
                      tm: increInfo.timestamp,
                      success: increInfo.count
                    })
                  )
                }
              })
            }
          }
        } catch (error) {
          console.error('Error parsing JSON:', error.message)
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': process.env.ACAO // Adjust as needed
          })
          res.end(JSON.stringify('Received POST request'))
        }
      })
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.ACAO // Adjust as needed
      })
      res.end(JSON.stringify(''))
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }
})

const PORT = 3001
exserver.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

