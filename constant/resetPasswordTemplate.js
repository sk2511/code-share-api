const resetPasswordTemplate = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            padding: 20px;
        }

        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 20px;
        }

        p {
            color: #555;
            line-height: 1.6;
        }

        a.button {
            display: inline-block;
            margin: 20px 0;
            padding: 12px 20px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
        }

        a.button:hover {
            background-color: #0056b3;
        }

        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #777;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>Password Reset Request</h1>
        <p>Hello,</p>
        <p>You requested a password reset for your account. Please click the button below to reset your password:</p>
        <a href="{{resetUrl}}" class="button">Reset My Password</a>
        <p>If you did not request this, please ignore this email.</p>
        <p>Thank you!</p>
        <div class="footer">
            <p>&copy; {{currentYear}} eDelta Enterprise solutions</p>
            <p>If you have questions, contact our support team.</p>
        </div>
    </div>
</body>

</html>
`

export default resetPasswordTemplate
