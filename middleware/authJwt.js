import jwt from 'jsonwebtoken'
import authconfig from '../config/authConfig.js'

const verifyToken = (req, res, next) => {
  try {
    let authorizationHeader = req.headers['authorization']

    if (!authorizationHeader) {
      return res.status(403).json({
        success: false,
        message: 'No authorization header provided!',
      })
    }

    let tokenParts = authorizationHeader.split(' ')
    if (tokenParts[0] !== 'Bearer' || tokenParts.length !== 2) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format.',
      })
    }

    let token = tokenParts[1]

    jwt.verify(token, authconfig.secret, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: err?.message,
        })
      }

      req.userId = decoded.id

      next()
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message,
    })
  }
}

const authJwt = {
  verifyToken: verifyToken,
}

export default authJwt
