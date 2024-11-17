/**
 * integrating mediasoup server with a node.js application
 */

/* Please follow mediasoup installation requirements */
/* https://mediasoup.org/documentation/v3/mediasoup/installation/ */
import express from 'express'
//import user from './routes/user.routes.js';
import user from './routes/user.js'

import https from 'httpolyglot'
import fs from 'fs'
import cors from 'cors'
import { Server } from 'socket.io'
import mediasoup from 'mediasoup'
import router from './routes/user.js'
import sequelize from './config/sequelize.js'

const app = express()
import * as dotenv from 'dotenv'
import ip from 'ip'
dotenv.config()
const {
  PORT,
  MEDIASOUP_LISTEN_IP,
  MEDIASOUP_RTCMAXPORT,
  MEDIASOUP_RTCMINPORT,
  MEDIASOUP_ANNOUNCED_IP,
} = process.env
import { addRoomDetails } from './controller/roomDetails.js'

app.use(express.json())
app.use(cors())

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.')
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err)
  })

app.use('/', router)

// SSL cert for HTTPS access
const options = {
  key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
  cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8'),
}

const httpsServer = https.createServer(options, app)
httpsServer.listen(PORT, () => {
  console.log('listening on port: ' + PORT)
})

const ip_address = ip.address()
console.log('mediasoup listening ip', MEDIASOUP_LISTEN_IP || '0.0.0.0')
console.log('mediasoup announced ip', MEDIASOUP_ANNOUNCED_IP || ip_address)

const io = new Server(httpsServer, {
  cors: '*',
})

// socket.io namespace (could represent a room?)
const connections = io.of('/mediasoup')

/**
 * Worker
 * |-> Router(s)
 *     |-> Producer Transport(s)
 *         |-> Producer
 *     |-> Consumer Transport(s)
 *         |-> Consumer
 **/
let worker
let userRooms = {}
let userRoomsData = {}
let rooms = {} // { roomName1: { Router, rooms: [ sicketId1, ... ] }, ...}
let peers = {} // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
let transports = [] // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = [] // [ { socketId1, roomName1, producer, }, ... ]
let consumers = [] // [ { socketId1, roomName1, consumer, }, ... ]

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    rtcMinPort: MEDIASOUP_RTCMINPORT,
    rtcMaxPort: MEDIASOUP_RTCMAXPORT,
  })

  worker.on('died', (error) => {
    // This implies something serious happened, so kill the application
    console.error('mediasoup worker has died')
    setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
  })

  return worker
}

// We create a Worker as soon as our application starts
worker = createWorker()

// This is an Array of RtpCapabilities
// https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecCapability
// list of media codecs supported by mediasoup ...
// https://github.com/versatica/mediasoup/blob/v3/src/supportedRtpCapabilities.ts
const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000,
    },
  },
]

connections.on('connection', async (socket) => {
  socket.on('receive dataText', (payload) => {
    const roomID = payload.roomID
    userRoomsData[roomID] = payload.data
    const usersInThisRoom = userRooms[roomID]
      ? userRooms[roomID].filter((id) => id !== socket.id)
      : []
    usersInThisRoom.map((item) => {
      socket.to(item).emit('send dataTextValue', {
        message: payload.data,
      })
    })
  })

  socket.on('addRoomId', async (data, callback) => {
    const res = await addRoomDetails(data)
    callback(res)
  })

  socket.on('updateRoomTitle', async (payload) => {
    const { roomID, title } = payload

    userRoomsData[roomID] = title
    const usersInThisRoom = userRooms[roomID]
      ? userRooms[roomID].filter((id) => id !== socket.id)
      : []
    usersInThisRoom.map((item) => {
      socket.to(item).emit('sendUpdatedTitle', {
        roomID,
        title,
      })
    })
  })

  socket.on('updateRoomSyntax', async (payload) => {
    const { roomID, syntax } = payload
    userRoomsData[roomID] = syntax
    const usersInThisRoom = userRooms[roomID]
      ? userRooms[roomID].filter((id) => id !== socket.id)
      : []
    usersInThisRoom.map((item) => {
      socket.to(item).emit('sendUpdatedLanguage', {
        roomID,
        syntax,
      })
    })
  })

  const removeItems = (items, socketId, type) => {
    items.forEach((item) => {
      if (item.socketId === socket.id) {
        item[type].close()
      }
    })
    items = items.filter((item) => item.socketId !== socket.id)

    return items
  }

  socket.on('disconnect', () => {
    // do some cleanup
    consumers = removeItems(consumers, socket.id, 'consumer')
    producers = removeItems(producers, socket.id, 'producer')
    transports = removeItems(transports, socket.id, 'transport')

    if (peers[socket.id]) {
      const { roomName } = peers[socket.id]

      if (userRooms[roomName]) {
        const arr = userRooms[roomName].filter((item) => item !== socket.id)
        userRooms[roomName] = [...arr]
      }

      delete peers[socket.id]

      // remove socket from room
      rooms[roomName] = {
        router: rooms[roomName].router,
        peers: rooms[roomName].peers.filter(
          (socketId) => socketId !== socket.id
        ),
      }
    }
  })

  socket.on('disconnect-transpot', () => {
    // do some cleanup
    consumers = removeItems(consumers, socket.id, 'consumer')
    producers = removeItems(producers, socket.id, 'producer')
    transports = removeItems(transports, socket.id, 'transport')
  })

  socket.on('joinRoom', async ({ roomName }, callback) => {
    // create Router if it does not exist
    // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
    const router1 = await createRoom(roomName, socket.id)

    peers[socket.id] = {
      socket,
      roomName, // Name for the Router this Peer joined
      transports: [],
      producers: [],
      consumers: [],
      peerDetails: {
        name: '',
        isAdmin: false, // Is this Peer the Admin?
      },
    }

    // get Router RTP Capabilities
    const rtpCapabilities = router1.rtpCapabilities
    // call callback from the client and send back the rtpCapabilities
    callback({ rtpCapabilities })
    if (userRooms[roomName]) {
      const arr = [...userRooms[roomName], socket.id]
      userRooms[roomName] = [...new Set(arr)]
    } else {
      userRooms[roomName] = [socket.id]
    }

    await socket.emit('send dataTextValue', {
      message: userRoomsData[roomName],
    })
  })

  const createRoom = async (roomName, socketId) => {
    // worker.createRouter(options)
    // options = { mediaCodecs, appData }
    // mediaCodecs -> defined above
    // appData -> custom application data - we are not supplying any
    // none of the two are required
    let router1
    let peers = []
    if (rooms[roomName]) {
      router1 = rooms[roomName].router
      peers = rooms[roomName].peers || []
    } else {
      router1 = await worker.createRouter({ mediaCodecs })
    }

    rooms[roomName] = {
      router: router1,
      peers: [...peers, socketId],
    }

    return router1
  }

  socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
    // get Room Name from Peer's properties
    if (peers[socket.id]) {
      const roomName = peers[socket.id].roomName

      // get Router (Room) object this peer is in based on RoomName
      const router = rooms[roomName].router
      let params = {}

      await createWebRtcTransport(router).then(
        (transport) => {
          ;(params.videoParams = {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          }),
            // add transport to Peer's properties
            addTransport(transport, roomName, consumer)
        },
        (error) => {
          console.log(error)
        }
      )

      callback({ params: params.videoParams })
    }
  })

  const addTransport = (transport, roomName, consumer) => {
    transports = [
      ...transports,
      { socketId: socket.id, transport, roomName, consumer },
    ]

    peers[socket.id] = {
      ...peers[socket.id],
      transports: [...peers[socket.id].transports, transport.id],
    }
  }

  const addProducer = (producer, roomName) => {
    producers = [...producers, { socketId: socket.id, producer, roomName }]

    peers[socket.id] = {
      ...peers[socket.id],
      producers: [...peers[socket.id].producers, producer.id],
    }
  }

  const addConsumer = (consumer, roomName) => {
    // add the consumer to the consumers list
    consumers = [...consumers, { socketId: socket.id, consumer, roomName }]

    // add the consumer id to the peers list
    peers[socket.id] = {
      ...peers[socket.id],
      consumers: [...peers[socket.id].consumers, consumer.id],
    }
  }

  socket.on('getProducers', (callback) => {
    //return all producer transports
    if (peers[socket.id]) {
      const { roomName } = peers[socket.id]

      let producerList = []
      producers.forEach((producerData) => {
        if (
          producerData.socketId !== socket.id &&
          producerData.roomName === roomName
        ) {
          producerList = [...producerList, producerData.producer.id]
        }
      })

      callback(producerList)
    }
    // return the producer list back to the client
  })

  const informConsumers = (roomName, socketId, id) => {
    // A new producer just joined
    // let all consumers to consume this producer
    producers.forEach((producerData) => {
      if (
        producerData.socketId !== socketId &&
        producerData.roomName === roomName
      ) {
        const producerSocket = peers[producerData.socketId].socket
        // use socket to send producer id to producer
        producerSocket.emit('new-producer', { producerId: id })
      }
    })

    consumers.forEach((producerData) => {
      if (
        producerData.socketId !== socketId &&
        producerData.roomName === roomName
      ) {
        const producerSocket = peers[producerData.socketId].socket
        // use socket to send producer id to producer
        producerSocket.emit('new-producer', { producerId: id })
      }
    })
  }

  const getTransport = (socketId) => {
    const [producerTransport] = transports.filter(
      (transport) => transport.socketId === socketId && !transport.consumer
    )
    return producerTransport.transport
  }

  // see client's socket.emit('transport-connect', ...)
  socket.on('transport-connect', ({ dtlsParameters }) => {
    getTransport(socket.id).connect({ dtlsParameters })
  })

  // see client's socket.emit('transport-produce', ...)
  socket.on(
    'transport-produce',
    async ({ kind, rtpParameters, appData }, callback) => {
      // call produce based on the prameters from the client
      const producer = await getTransport(socket.id).produce({
        kind,
        rtpParameters,
      })

      // add producer to the producers array
      const { roomName } = peers[socket.id]

      addProducer(producer, roomName)

      userRooms[roomName].map((item) =>
        socket.to(item).emit('some-one-joined', {})
      )
      informConsumers(roomName, socket.id, producer.id)

      producer.on('transportclose', () => {
        producer.close()
      })

      // Send back to the client the Producer's id
      callback({
        id: producer.id,
        producersExist: producers.length > 1 ? true : false,
      })
    }
  )

  // see client's socket.emit('transport-recv-connect', ...)
  socket.on(
    'transport-recv-connect',
    async ({ dtlsParameters, serverConsumerTransportId }) => {
      const consumerTransport = transports.find(
        (transportData) =>
          transportData.consumer &&
          transportData.transport.id == serverConsumerTransportId
      ).transport
      await consumerTransport.connect({ dtlsParameters })
    }
  )

  socket.on(
    'consume',
    async (
      { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
      callback
    ) => {
      try {
        const { roomName } = peers[socket.id]
        const router = rooms[roomName].router
        let consumerTransport = transports.find(
          (transportData) =>
            transportData.consumer &&
            transportData.transport.id == serverConsumerTransportId
        ).transport

        // check if the router can consume the specified producer
        if (
          router.canConsume({
            producerId: remoteProducerId,
            rtpCapabilities,
          })
        ) {
          // transport can now consume and return a consumer
          const consumer = await consumerTransport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true,
          })

          consumer.on('producerclose', () => {
            socket.emit('producer-closed', { remoteProducerId })

            consumerTransport.close([])
            transports = transports.filter(
              (transportData) =>
                transportData.transport.id !== consumerTransport.id
            )
            consumer.close()
            consumers = consumers.filter(
              (consumerData) => consumerData.consumer.id !== consumer.id
            )
          })

          addConsumer(consumer, roomName)

          // from the consumer extract the following params
          // to send back to the Client
          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id,
          }

          // send the parameters to the client
          callback({ params })
        }
      } catch (error) {
        console.log(error?.message)
        callback({
          params: {
            error: error,
          },
        })
      }
    }
  )

  socket.on('consumer-resume', async ({ serverConsumerId }) => {
    const { consumer } = consumers.find(
      (consumerData) => consumerData.consumer.id === serverConsumerId
    )
    await consumer.resume()
  })
})

const createWebRtcTransport = async (router) => {
  return new Promise(async (resolve, reject) => {
    try {
      // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
      const webRtcTransport_options = {
        listenIps: [
          {
            ip: MEDIASOUP_LISTEN_IP || '0.0.0.0',
            announcedIp: MEDIASOUP_ANNOUNCED_IP || ip_address,
          },
        ],
        enableUdp: true, // Enable UDP for media transport (default is true)
        enableTcp: true, // Enable TCP as a fallback in case UDP is blocked
        preferUdp: true, // Prefer UDP transport over TCP
        preferTcp: false, // Only use TCP if UDP is not possible
        minPort: MEDIASOUP_RTCMINPORT, // Minimum port to use for WebRTC transport
        maxPort: MEDIASOUP_RTCMAXPORT, // Maximum port to use for WebRTC transport
      }

      // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
      let transport = await router.createWebRtcTransport(
        webRtcTransport_options
      )

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          transport.close()
        }
      })

      resolve(transport)
    } catch (error) {
      reject(error)
    }
  })
}
