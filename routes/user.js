import * as user from '../controller/user.js'
import * as userRoomDetails from '../controller/roomDetails.js'
import express from 'express'
import authJwt from '../middleware/authJwt.js'

const router = express.Router()

router.post('/signup', user.signup)
router.post('/signin', user.singin)

router.post('/forgot-password', user.forgotPassword)
router.post('/reset-password/:token', user.resetPassword)

router.get('/get-user', authJwt.verifyToken, user.getDetails)
router.post('/update-user', authJwt.verifyToken, user.updateDetails)
router.get('/get-codes', authJwt.verifyToken, userRoomDetails.getRoomDetails)
router.post(
  '/remove-codes',
  authJwt.verifyToken,
  userRoomDetails.RemoveRoomDetails
)
router.post('/update-code', authJwt.verifyToken, userRoomDetails.updateRoomCode)
router.get(
  '/get-room/:roomID',
  authJwt.verifyToken,
  userRoomDetails.findRoomById
)

router.post('/create-room', authJwt.verifyToken, userRoomDetails.addRoomDetails)

export default router
