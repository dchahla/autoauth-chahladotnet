const { exec } = require('child_process')
const parsedData = require('./speedParser')
const { ref } = require('./fbauth')

const pathtoexecutDir = `/root/websocketsecure/goexecutes`
const pathtoexecutFile = `/root/websocketsecure/goexecutes/main`
// console.log(pathtoexecut.charAt(pathtoexecut.length - 1))

const goracer = {
  run: function (urlinputjsonfile) {
    return new Promise((resolve, reject) => {
      const scriptPath = ` ${pathtoexecutFile} -usefile -pathtocheck=${urlinputjsonfile}`
      console.log(scriptPath)
      const cpuLimitPercent = 0.01 // Set your desired CPU limit percentage

      // const command = `cpulimit --limit=${cpuLimitPercent} -- ${scriptPath}`
      // const command = `cputhrottle $(pgrep -f ${scriptPath}) ${cpuLimitPercent}`
      const command = `cpulimit -l 10 -- ${scriptPath}`

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`)
          return
        }
        console.log(`Script output: ${stdout}`)
        // console.log(parsedData(stdout))
        ref
          .child('find')
          .child('lastRun')
          .set(JSON.parse(parsedData(stdout)))
        // ref.child('find').child('lastInfo').set()
        resolve(parsedData(stdout))
      })
    })
  }
}

module.exports = goracer
