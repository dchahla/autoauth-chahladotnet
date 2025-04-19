function parseData (input) {
  const lines = input.split('\n')
  const parsedData = []

  for (let i = 0; i < lines.length; i += 1) {
    const urlLine = lines[i].trim()
    const dataLine = lines[i + 1] ? lines[i + 1].trim() : null

    if (urlLine && urlLine.includes(' content-size: ')) {
      const [url, contentSize] = urlLine.split(' content-size: ')

      if (dataLine) {
        const [contentSizeHost, nanosecondsValue] = dataLine.split(' ')

        if (url && contentSize && contentSizeHost && nanosecondsValue) {
          const ratio =
            parseInt(contentSize) / nanosecondsToSeconds(nanosecondsValue)
          parsedData.push({
            url: url,
            'content-size': parseInt(contentSize),
            nanoseconds: parseInt(nanosecondsValue),
            seconds: nanosecondsToSeconds(nanosecondsValue),
            'bytes-per-second': ratio
          })
        }
      }
    }
    if (
      (urlLine && urlLine.includes('Error sending request: ')) ||
      urlLine.includes('Error creating request:')
    ) {
      // const [url, contentSize] = urlLine.split(' content-size: ')
      const contentSize = 0
      if (dataLine) {
        const [url, nanosecondsValue] = dataLine.split(' ')
        console.log(url, nanosecondsValue)
        if (url && nanosecondsValue) {
          const ratio =
            parseInt(contentSize) / nanosecondsToSeconds(nanosecondsValue)
          parsedData.push({
            url: url,
            'content-size': parseInt(contentSize),
            nanoseconds: parseInt(nanosecondsValue),
            seconds: nanosecondsToSeconds(nanosecondsValue),
            'bytes-per-second': ratio
          })
        }
      }
    }
  }

  return JSON.stringify(parsedData, null, 2)
}
function nanosecondsToSeconds (nanoseconds) {
  return nanoseconds / 1e9 // 1 second = 1e9 nanoseconds
}
module.exports = parseData

// const input = `
// Error sending request: Get "http://o.com": dial tcp: lookup o.com: no such host
// http://o.com 4890831
// https://amazon.com content-size: 6591 bytes
// https://amazon.com 617613938
// https://yahoo.com content-size: 1591459 bytes
// https://yahoo.com 893689449
// https://youtube.com content-size: 868768 bytes
// https://youtube.com 968598554
// Best host: http://o.com with loadtime of : 4890831 nanoseconds
// //     `

// const jsonData = parseData(input)
// console.log(jsonData)

