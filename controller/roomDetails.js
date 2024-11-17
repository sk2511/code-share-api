import User from '../models/user.js'
import UserRoomDetails from '../models/userRoomDetails.js'

const addRoomDetails = async (data) => {
  const roomId = (Math.random() + 1).toString(36).substring(6)
  const { userId, title, syntax } = data
  try {
    const user = await User.findOne({
      where: { id: userId },
    })

    if (user) {
      const roomCount = await UserRoomDetails.count({
        where: { user_id: userId },
      })

      if (roomCount >= 10) {
        return { error: 'User cannot have more than 10 room entries.' }
      }

      const roomDetails = {
        user_id: userId,
        room_id: roomId,
        syntax: syntax || '',
        title: title || '',
      }
      await UserRoomDetails.create(roomDetails)
      return { roomId }
    }
  } catch (error) {
    return { error: 'An error occurred while adding room details.' }
  }
}

const getRoomDetails = async (req, res) => {
  const userId = req?.userId
  try {
    const RoomDetail = await UserRoomDetails.findAll({
      where: {
        user_id: userId,
      },
    })
    res.status(200).json({
      userRoomDetails: RoomDetail?.map((data) => data?.dataValues),
      status: 'success',
    })
  } catch (error) {
    return res.status(500).send({ status: 'error', message: error.message })
  }
}

const RemoveRoomDetails = async (req, res) => {
  const { room_id } = req?.body
  try {
    const result = await UserRoomDetails.destroy({
      where: {
        id: room_id,
      },
    })
    if (result === 0) {
      return res.status(404).json({ message: 'Room not found.' })
    } else {
      return res
        .status(200)
        .json({ status: 'success', message: 'Room deleted successfully' })
    }
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

const updateRoomCode = async (req, res) => {
  const { roomID, title, syntax } = req?.body
  try {
    const result = await UserRoomDetails.update(
      { title: title, syntax: syntax, updated_at: new Date() },
      {
        where: {
          room_id: roomID,
        },
      }
    )
    if (result[0] === 0) {
      return res.status(404).json({ message: 'Room not found.' })
    } else {
      return res
        .status(200)
        .json({ status: 'success', message: 'Room updated successfully' })
    }
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

const findRoomById = async (req, res) => {
  const { roomID } = req?.params
  try {
    const result = await UserRoomDetails.findOne({
      where: {
        room_id: roomID,
      },
    })
    if (!result) {
      return res.status(200).json({})
    } else {
      return res.status(200).json(result?.toJSON())
    }
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

export {
  addRoomDetails,
  getRoomDetails,
  RemoveRoomDetails,
  updateRoomCode,
  findRoomById,
}
