const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendVerificationEmail(email, username, OTP) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    // "syedbilal.dev27@gmail.com"
    // to: email,
    to: ["syedbilal.dev27@gmail.com"],

    subject: "Verify your email address",

    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Verify your email</title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background: #f4f4f5;
            font-family: Arial, Helvetica, sans-serif;
          "
        >
          <div
            style="
              max-width: 520px;
              margin: 40px auto;
              padding: 32px;
              background: #ffffff;
              border-radius: 12px;
            "
          >
            <h1
              style="
                margin: 0 0 16px;
                font-size: 24px;
                color: #18181b;
              "
            >
              Verify your email
            </h1>

            <p
              style="
                margin: 0 0 16px;
                color: #52525b;
                font-size: 16px;
                line-height: 1.6;
              "
            >
              Hi ${username},
            </p>

            <p
              style="
                margin: 0 0 24px;
                color: #52525b;
                font-size: 16px;
                line-height: 1.6;
              "
            >
              Use the verification code below to verify your email address.
            </p>

            <div
              style="
                margin: 24px 0;
                padding: 20px;
                background: #f4f4f5;
                border-radius: 8px;
                text-align: center;
              "
            >
              <span
                style="
                  font-size: 32px;
                  font-weight: 700;
                  letter-spacing: 8px;
                  color: #18181b;
                "
              >
                ${OTP}
              </span>
            </div>

            <p
              style="
                margin: 0 0 8px;
                color: #71717a;
                font-size: 14px;
              "
            >
              This code expires in 10 minutes.
            </p>

            <p
              style="
                margin: 24px 0 0;
                color: #a1a1aa;
                font-size: 13px;
                line-height: 1.5;
              "
            >
              If you didn't create an account, you can safely ignore this
              email.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error("Failed to send verification email");
  }

  return data;
}

module.exports = sendVerificationEmail;
