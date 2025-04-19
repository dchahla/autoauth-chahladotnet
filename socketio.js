const http = require('http')
const io = require('socket.io')

const server = http.createServer()
const socketServer = io(server)

const userConnections = {} // To store user-specific WebSocket connections

socketServer.on('connection', socket => {
  // Handle connection event
  console.log('Client connected:', socket.id)

  // Handle user-specific messages
  socket.on('user_message', data => {
    const { userId, message } = data

    // Find the user's WebSocket connection
    const userSocket = userConnections[userId]

    if (userSocket) {
      // Send the message only to that user
      userSocket.emit('user_message', message)
    }
  })

  // Store the WebSocket connection associated with a user
  socket.on('set_user_id', userId => {
    userConnections[userId] = socket
  })

  // Handle disconnection event
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)

    // Remove the WebSocket connection from the userConnections object
    const userId = Object.keys(userConnections).find(
      key => userConnections[key] === socket
    )
    if (userId) {
      delete userConnections[userId]
    }
  })
})

// Start the server
const PORT = 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
