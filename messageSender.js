import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "ruhitinfo@gmail.com",
    pass: "yvgrgjekmsjazaki", // Use a real app password
  },
});

export async function mailSender(name, email) {
  try {
    // Validate email input
    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new Error("Invalid recipient email address");
    }

    // Ensure email is a string (not an array)
    const recipients = typeof email === "string" ? email : email.join(", ");

    const info = await transporter.sendMail({
      from: '"Your Name" <ruhitinfo@gmail.com>', // Fixed format
      to: recipients, // Properly formatted recipients
      subject: "Your Subject Here", // Better subject
      text: "Plain text version", // Fallback text
      html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Welcome to [Your Company]!</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            background-color: #f8f9fa;
        }
        .logo {
            max-width: 150px;
        }
        h1 {
            color: #2c3e50;
            font-size: 24px;
            margin-top: 20px;
        }
        .content {
            padding: 20px;
            background-color: #ffffff;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3498db;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #7f8c8d;
            background-color: #f8f9fa;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to Teachable!</h1>
    </div>
    
    <div class="content">
        <p>Dear ${name},</p>
        
        <p>Thank you for joining the Reachable community! We're thrilled to have you on board.</p>
        
        <p>As a valued member, you'll now receive:</p>
        <ul>
            <li>Our weekly newsletter with industry insights</li>
            <li>Exclusive offers and promotions</li>
            <li>Early access to new products/services</li>
            <li>Helpful tips and resources</li>
        </ul>
        
        <p>To get started, check out our most popular resources:</p>
        <a href="https://yourcompany.com/getting-started" class="button">Get Started</a>
        
        <p>If you have any questions, simply reply to this email or visit our <a href="https://yourcompany.com/help">help center</a>.</p>
        
        <p>Welcome aboard!</p>
        
        <p>Best regards,<br>
        The Teachable Team</p>
    </div>

</body>
</html>`, // Ensure HTML exists
    });

    console.log("Message sent to:", recipients);
    console.log("Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("Email sending failed:", err.message);
    throw err; // Re-throw to handle in calling function
  }
}

//yvgrgjekmsjazaki
