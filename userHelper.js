const redisConnect = require('./redisConnect')
const client = redisConnect()
const { v4: uuidV4 } = require('uuid')
const { ref } = require('./fbauth')
const fs = require('fs')
const goracer = require('./goAdapter')
const path = require('path')

async function runtest (p) {
  const testresults = await goracer.run(p)
  // console.log(testresults)
  return testresults
}
let isActive

setInterval(() => {
  client.lrange(`p:${'chahla.net'}`, 0, 0, async (err, rsps) => {
    console.log(err, rsps)
    if (rsps.length && rsps.toString().includes('|:::|')) {
      const [timestamp, jsonString] = rsps.toString().split('|:::|')
      if (jsonString.trim().length) {
        const data = JSON.parse(jsonString.trim())
        client.get('isDoingGoWebsiteRace', function (err, isActivePersist) {
          console.log(err, isActivePersist)
          if (!isActive && !isActivePersist && !err) {
            isActive = path.join(__dirname, `${timestamp}.json`)
            client.set(
              'isDoingGoWebsiteRace',
              path.join(__dirname, `${timestamp}.json`),
              function (errr, completeBool) {
                console.log(errr, completeBool)

                client.expire('isDoingGoWebsiteRace', 30)
                console.log(data.allUrls)
                fs.writeFile(
                  path.join(__dirname, `${timestamp}.json`),
                  JSON.stringify(data.allUrls),
                  async err => {
                    if (err) {
                      console.error('Error writing to file:', err)
                    } else {
                      console.log(
                        'File has been saved to the current directory.'
                      )
                      const out = await runtest(
                        path.join(__dirname, `${timestamp}.json`)
                      )
                      client.ltrim(`p:${'chahla.net'}`, 1, -1, (err, rsp) => {
                        console.log(err, rsp)
                        client.lrange(
                          `p:${'chahla.net'}`,
                          0,
                          7,
                          async (err, rsps) => {
                            console.log(err, rsps)
                            ref.child('find').child('lastRunId').set(timestamp)

                            ref
                              .child('queue')
                              .child('nanoseconds')
                              .child('stage')
                              .set(rsps)
                            const postLength = await client.llen(
                              `p:${'chahla.net'}`
                            ) //chahla.net reps any long list ref, could be user posts, group posts

                            fs.unlinkSync(
                              path.join(__dirname, `${timestamp}.json`)
                            )
                            ref
                              .child('queue')
                              .child('nanoseconds')
                              .child('count')
                              .set(postLength)
                          }
                        )
                      }) // removes first element
                      setTimeout(() => {
                        isActive = false
                      }, 20000)
                      console.log('out', out)
                    }
                  }
                )
                // client.set('lastRun', ...)
              }
            )
          }
        })
      }
    }
  })
}, 30000)

const userHelper = {
  increment: async function (content) {
    return new Promise(async (resolve, reject) => {
      //   const newuuid = uuidV4()
      const newuuid = new Date().getTime()
      const postLength = await client.llen(`p:${'chahla.net'}`) //chahla.net reps any long list ref, could be user posts, group posts
      console.log('previous postLength', postLength)
      const multi = client.multi()
      multi.set(`p:${newuuid}`, JSON.stringify(content))
      // multi.set(`p:${newuuid}`, JSON.stringify(content))
      multi.lrange(`p:${'chahla.net'}`, 0, 7)
      multi.lrange(`p:${'chahla.net'}`, 0, -1)

      multi.rpush(
        `p:${'chahla.net'}`,
        `${newuuid}|:::|${JSON.stringify(content)}`
      )
      // remove the keys
      // multi.keys(`offer:*`)
      //   console.log(newuuid)
      multi.exec((err, replies) => {
        if (err) {
          throw console.error(err)
        }
        //   console.log(replies)
        // if (replies[1][1].length < 10) {
        //   replies[1][1].push(
        //     `${newuuid}|:::|${JSON.stringify(content)}`
        //   )
        // }
        // replies[1][1].push(`${newuuid}|:::|${JSON.stringify(content)}`)
        if (replies[2][1] && replies[1][1].length < 7) {
          replies[2][1].push(`${newuuid}|:::|${JSON.stringify(content)}`)
          const arrayOfItems = replies[2][1] // lrange
          //   console.log('full list', replies[2][1])
          finish(arrayOfItems)
        } else {
          const arrayOfItems = replies[1][1]
          finish(arrayOfItems)
        }

        function finish (arrayOfItems) {
          const jobs = arrayOfItems.reduce((accumulator, element) => {
            const [timestamp, jsonString] = element.split('|:::|')
            const data = JSON.parse(jsonString)
            console.log(data.allUrls)
            //upnext test?

            accumulator.push({ timestamp, data })
            return accumulator
          }, [])

          //   console.log('jobs', jobs)

          ref
            .child('queue')
            .child('nanoseconds')
            .child('stage')
            .set(arrayOfItems)

          ref
            .child('queue')
            .child('nanoseconds')
            .child('count')
            .set(postLength + 1)
          resolve({
            timestamp: newuuid,
            lastTen: arrayOfItems,
            previousCount: postLength,
            count: postLength + 1
          })
        }

        //   ref.child('queue').child('chahla.net').child().set(groupReps)

        //   replies[1][1].map(function (val) {
        //     // console.log(val)
        //     var parsed = JSON.parse(val)
        //     groupReps[parsed.uuid] = parsed
        //   })
        //   console.log({ groupReps })
        //   console.log({ uuid })

        //   reps.push(uuid)
        //   ref.child('profile').child(body.sub).child('post').set(reps.concat())
        //   ref
        //     .child('profile')
        //     .child(body.sub)
        //     .child('post')
        //     .child('postCount')
        //     .set(postLength + 1)
        //   ref.child('postsByGroup').child(req.body.group).set(groupReps)
      })
    })
  }
}
module.exports = userHelper

// const postLength = yield client.llen((`p:${req.user.sub}`))
// const groupPostLength = yield client.llen((`p:${req.body.group}`))
// const multi = client.multi()
// // remove from the index
// multi.set(`p:${uuid}`,JSON.stringify(content))
// multi.lrange(`p:${req.user.sub}`, postLength -10, postLength)
// multi.rpush(`p:${req.user.sub}`,`${uuid}`)
// multi.rpush(`p:${req.body.group}`,JSON.stringify(content))
// multi.lrange(`p:${req.body.group}`, groupPostLength -10, groupPostLength)
// // remove the keys
// // multi.keys(`offer:*`)
