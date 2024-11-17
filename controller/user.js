import authConfig from '../config/authConfig.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/user.js'
import UserRoomDetails from '../models/userRoomDetails.js'
import { addRoomDetails } from './roomDetails.js'
import config from '../config/config.js'
import sendEmail from '../services/sendEmail.js'
import resetPasswordTemplate from '../constant/resetPasswordTemplate.js'

const signup = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      email,
      companyname,
      employee,
      password,
      designation,
    } = req.body
    const create_user = {
      first_name: firstname,
      last_name: lastname,
      email: email,
      company_name: companyname,
      number_of_employee: employee,
      password: bcrypt.hashSync(password, 8),
      designation,
    }
    const result = await User.findOne({
      where: {
        email: email,
      },
    })
    if (result) {
      return res.status(400).send({
        message: 'Failed! Email is already in use!',
      })
    }
    const user = await User.create(create_user)
    if (user) {
      res.status(201).send({
        message: 'User created successfully!',
      })
    }
  } catch (error) {
    res.status(500).send({
      message: error.message || 'Some error occurred while creating the user.',
    })
  }
}

const singin = async (req, res) => {
  try {
    const result = await User.findOne({
      where: {
        email: req?.body?.email,
      },
    })
    if (!result) {
      return res.status(400).send({ message: 'Email Not found.' })
    }

    const user = result.toJSON()
    const passwordIsValid = bcrypt.compareSync(
      req?.body?.password,
      user?.password
    )
    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: 'Invalid Password!',
      })
    }

    var token = jwt.sign({ id: user.id }, authConfig.secret, {
      expiresIn: '1d',
    })

    const roomDetails = await UserRoomDetails.findOne({
      where: {
        user_id: user.id,
      },
    })

    let roomId = roomDetails?.dataValues?.room_id
    if (!roomId) {
      const newRoomId = await addRoomDetails({ userId: user.id })
      roomId = newRoomId?.roomId
    }

    res.status(200).send({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      accessToken: token,
      roomId,
    })
  } catch (error) {
    res.status(500).send({ message: error.message || 'Failed to login' })
  }
}

const getDetails = async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        id: req?.userId,
      },
    })

    var token = jwt.sign({ id: user.id }, authConfig.secret, {
      expiresIn: '1d',
    })

    return res.status(200).json({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      companyname: user.company_name,
      employee: user.number_of_employee,
      designation: user.designation,
      accessToken: token,
    })
  } catch (error) {
    res.status(500).send({ message: error.message })
  }
}

const updateDetails = async (req, res) => {
  const { firstName, lastName, email, companyname, employee, designation } =
    req?.body
  try {
    const result = await User.update(
      {
        first_name: firstName,
        last_name: lastName,
        email: email,
        company_name: companyname,
        number_of_employee: employee,
        designation,
      },
      {
        where: {
          id: req?.userId,
        },
      }
    )
    if (result[0] === 0) {
      return res.status(404).json({ message: 'User not found.' })
    }
    res.status(200).json({ status: 'success', message: 'User updated successfully' })
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ where: { email } })

    if (!user) {
      return res
        .status(400)
        .json({ message: 'User with this email does not exist.' })
    }

    const token = jwt.sign({ id: user.id }, authConfig.secret, {
      expiresIn: '1d',
    })

    const resetUrl = `${process.env.CODE_SHARE_FRONTEND_URL}/reset-password/${token}`
    const currentYear = new Date().getFullYear()
    const template = resetPasswordTemplate
      .replace('{{resetUrl}}', resetUrl)
      .replace('{{currentYear}}', currentYear)
      .replace('{{email}}', user.email)

    const mailOptions = {
      from: config.from_email,
      to: user.email,
      subject: 'Password Reset',
      html: template,
    }

    await sendEmail(mailOptions)

    res.status(200).json({ status: 'success', message: 'Password reset email sent.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body
    const token = req.params.token
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' })
    }
    if (!token) {
      return res.status(400).json({ message: 'Invalid token.' })
    }
    jwt.verify(token, authConfig.secret, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' })
      }
      const user = await User.findOne({ where: { id: decoded.id } })
      if (!user) {
        return res.status(404).json({ message: 'User not found.' })
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      user.password = hashedPassword
      const result = await User.update(
        { password: hashedPassword },
        {
          where: {
            id: decoded.id,
          },
        }
      )
      if (result[0] === 0) {
        return res
          .status(500)
          .json({ message: 'An error occurred while resetting password.' })
      }
      res.status(200).json({ status: 'success', message: 'Password reset successful.' })
    })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'An error occurred while resetting password.' })
  }
}
export {
  signup,
  singin,
  getDetails,
  updateDetails,
  forgotPassword,
  resetPassword,
}
