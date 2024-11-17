import config from '../config/config.js'
import { createTransport } from 'nodemailer'

const sendEmail = (params) => {
  try {
    const mailTransporter = createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      auth: {
        user: config.smtp_username,
        pass: config.smtp_password,
      },
    })

    const mailDetails = {
      from: config.from_email,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }

    mailTransporter.sendMail(mailDetails, (error, info) => {
      if (error) {
        console.log('Error while sending the email', error)
        return error
      } else {
        console.log('Email sent successfully')
        return info.response
      }
    })
  } catch (error) {
    console.log('Error while sending the email', error)
    return error
  }
}

export default sendEmail
